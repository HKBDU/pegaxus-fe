import { canAccess } from "@/features/auth/access-control";
import { useAuthStore } from "@/features/auth/store";
import { getLocationSharingError, locationSharingService } from "./services";
import {
  locationFromPosition,
  isFreshObservation,
  SEND_INTERVAL_MS,
} from "./position";
import type { DriverLocationRequest, LocationSharingState } from "./types";

type SenderContext = {
  transportId?: string;
  accountId?: string;
  sessionVersion: number;
  eligible: boolean;
  revision?: string;
  onReload: () => void;
};

// A second mounted sender cannot own GPS or overlap a still-settling GP2 request.
let owner: LocationSender | null = null;
let gp2InFlight = false;

const initialState = (): LocationSharingState => ({
  sharingStatus: "stopped",
  permissionStatus: "not_requested",
  networkStatus: "unknown",
  lastSuccessfulTransmissionAt: null,
  active: false,
  sending: false,
  restartBlocked: false,
  message: null,
  notification: "none",
});

export class LocationSender {
  private state = initialState();
  private listeners = new Set<() => void>();
  private context: SenderContext = {
    sessionVersion: -1,
    eligible: false,
    onReload: () => {},
  };
  private generation = 0;
  private watchId: number | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private request: AbortController | null = null;
  private denialRequest: AbortController | null = null;
  private permission: PermissionStatus | null = null;
  private sample: { body: DriverLocationRequest; timestamp: number } | null =
    null;
  private acquiredAfter = 0;
  private newestObservation = 0;
  private lastAttempt = -Infinity;
  private rejectedRevision: string | undefined;

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(patch: Partial<LocationSharingState>) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }
  configure(context: SenderContext) {
    const changed =
      this.context.transportId !== context.transportId ||
      this.context.accountId !== context.accountId ||
      this.context.sessionVersion !== context.sessionVersion;
    this.context = context;
    if (changed) {
      this.release();
      this.state = initialState();
      this.publish({ networkStatus: navigator.onLine ? "online" : "offline" });
    } else if (
      !this.authorized() &&
      (this.state.active || this.denialRequest)
    ) {
      this.stopWith(
        "transport_unavailable",
        "Journey context or authorization changed. Reload before starting again.",
      );
    }
    if (
      this.state.restartBlocked &&
      this.authorized() &&
      context.revision !== this.rejectedRevision
    ) {
      this.publish({ restartBlocked: false });
    }
  }
  private authorized() {
    const auth = useAuthStore.getState();
    return (
      this.context.eligible &&
      Boolean(this.context.transportId) &&
      Boolean(auth.accessToken) &&
      auth.principal?.id === this.context.accountId &&
      auth.sessionVersion === this.context.sessionVersion &&
      canAccess(auth.principal, { anyRole: ["DRIVER"] })
    );
  }
  private current(generation: number) {
    return generation === this.generation && this.authorized();
  }
  private foreground() {
    return navigator.onLine && document.visibilityState === "visible";
  }
  mount() {
    const unsubscribeAuth = useAuthStore.subscribe(() => {
      if (!this.authorized() && (this.state.active || this.denialRequest)) {
        this.stopWith(
          "transport_unavailable",
          "Your account or Driver authorization changed. Sharing has stopped.",
        );
      }
    });
    window.addEventListener("offline", this.onEnvironment);
    window.addEventListener("online", this.onEnvironment);
    document.addEventListener("visibilitychange", this.onEnvironment);
    window.addEventListener("pagehide", this.onPageHide);
    return () => {
      unsubscribeAuth();
      window.removeEventListener("offline", this.onEnvironment);
      window.removeEventListener("online", this.onEnvironment);
      document.removeEventListener("visibilitychange", this.onEnvironment);
      window.removeEventListener("pagehide", this.onPageHide);
      if (this.state.active || this.request || this.denialRequest) {
        this.stopWith(
          "stopped",
          "Sharing stopped when leaving this screen. Choose Start to resume.",
        );
      } else this.release();
    };
  }
  private onPageHide = () => {
    this.stopWith(
      "stopped",
      "Sharing stopped when leaving this page. Choose Start to resume.",
    );
  };
  private onEnvironment = () => {
    this.publish({ networkStatus: navigator.onLine ? "online" : "offline" });
    if (!this.state.active) {
      // An interrupted GP3 is not queued for reconnect.
      if (this.denialRequest && !this.foreground()) {
        this.clearResources();
        this.publish({ notification: "failed" });
      }
      return;
    }
    if (!this.authorized()) {
      this.stopWith(
        "transport_unavailable",
        "Journey authorization is unavailable. Sharing stopped.",
      );
    } else if (!this.foreground()) {
      this.clearResources();
      this.publish({
        sharingStatus: navigator.onLine ? "paused" : "offline",
        sending: false,
        message: navigator.onLine
          ? "Paused while this page is hidden. Return here to acquire a new location."
          : "Offline. GPS acquisition and sends are paused; missed points are discarded.",
      });
    } else if (this.watchId === null) {
      this.acquire();
    }
  };
  start = () => {
    if (this.state.active || this.state.restartBlocked) return;
    if (!this.authorized()) {
      this.stopWith(
        "transport_unavailable",
        "A real, available IN_TRANSIT journey and Driver account are required.",
      );
      return;
    }
    if (!window.isSecureContext || !("geolocation" in navigator)) {
      this.stopWith(
        "unsupported",
        "Location sharing requires a secure page and a browser with location support.",
      );
      return;
    }
    if (!this.foreground()) {
      this.publish({
        sharingStatus: navigator.onLine ? "paused" : "offline",
        message: "Open this page while online, then choose Start.",
      });
      return;
    }
    if (owner && owner !== this)
      owner.stopWith(
        "stopped",
        "Another location sharing screen took over this session.",
      );
    this.clearResources();
    // oxlint-disable-next-line typescript/no-this-alias -- intentional single-owner lease, not a callback alias
    owner = this;
    this.publish({
      active: true,
      sending: false,
      notification: "none",
      message: null,
    });
    this.acquire();
  };
  stop = () =>
    this.stopWith(
      "stopped",
      "Stopped by you. No new locations will be collected or sent.",
    );
  private stopWith(
    status: LocationSharingState["sharingStatus"],
    message: string,
  ) {
    const notifying = Boolean(this.denialRequest);
    this.release();
    this.publish({
      active: false,
      sending: false,
      sharingStatus: status,
      message,
      ...(notifying ? { notification: "failed" as const } : {}),
    });
  }
  private release() {
    this.clearResources();
    if (owner === this) owner = null;
  }
  private clearResources() {
    ++this.generation;
    if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.request?.abort();
    this.request = null;
    this.denialRequest?.abort();
    this.denialRequest = null;
    if (this.permission) this.permission.onchange = null;
    this.permission = null;
    this.sample = null;
  }
  private acquire() {
    this.clearResources();
    const generation = this.generation;
    this.acquiredAfter = Date.now();
    this.newestObservation = 0;
    this.publish({
      sharingStatus:
        this.state.permissionStatus === "granted"
          ? "acquiring_location"
          : "requesting_permission",
      permissionStatus:
        this.state.permissionStatus === "granted" ? "granted" : "prompt",
      sending: false,
      message: "Waiting for a new GPS observation. Keep this page visible.",
    });
    void this.observePermission(generation);
    try {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => this.onPosition(position, generation),
        (error) => this.onPositionError(error, generation),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
      );
      this.schedule(generation);
    } catch {
      this.stopWith(
        "location_unavailable",
        "The browser could not start location acquisition. Check location settings and try again.",
      );
    }
  }
  private async observePermission(generation: number) {
    // Only after explicit Start. watchPosition still owns the actual permission prompt.
    try {
      if (typeof navigator.permissions?.query !== "function") return;
      const permission = await navigator.permissions.query({
        name: "geolocation",
      });
      if (!this.current(generation) || !this.state.active) return;
      this.permission = permission;
      const update = () => {
        if (!this.current(generation) || !this.state.active) return;
        if (permission.state === "denied") this.denied(generation);
        else {
          if (
            permission.state === "prompt" &&
            this.state.permissionStatus === "granted"
          ) {
            this.stopWith(
              "location_unavailable",
              "Location permission changed. Choose Start to request access again.",
            );
            this.publish({ permissionStatus: "prompt" });
            return;
          }
          this.publish({
            permissionStatus:
              permission.state === "granted" ? "granted" : "prompt",
          });
          if (
            permission.state === "granted" &&
            this.state.sharingStatus === "requesting_permission"
          ) {
            this.publish({ sharingStatus: "acquiring_location" });
          }
        }
      };
      permission.onchange = update;
      update();
    } catch {
      // Unsupported descriptors and synchronous API failures use actual watch callbacks.
    }
  }
  private onPosition(position: GeolocationPosition, generation: number) {
    if (!this.current(generation) || !this.state.active || !this.foreground())
      return;
    this.publish({ permissionStatus: "granted" });
    const now = Date.now();
    const body = locationFromPosition(position, now);
    if (
      !body ||
      position.timestamp < this.acquiredAfter ||
      position.timestamp <= this.newestObservation
    ) {
      if (!this.sample && !this.state.sending && !this.hasObservationError())
        this.publish({
          sharingStatus: "acquiring_location",
          message: "Waiting for a fresh, valid GPS observation.",
        });
      return;
    }
    this.newestObservation = position.timestamp;
    this.sample = { body, timestamp: position.timestamp };
    if (this.state.sharingStatus !== "sharing" && !this.state.sending)
      this.publish({
        sharingStatus: "waiting_to_send",
        message: "GPS acquired. Waiting for the next send opportunity.",
      });
    // Only the first opportunity can be immediate; later observations never add send timers.
    if (this.lastAttempt === -Infinity) {
      void this.send(generation);
    }
  }
  private onPositionError(error: GeolocationPositionError, generation: number) {
    if (!this.current(generation) || !this.state.active) return;
    if (error.code === 1) {
      this.denied(generation);
      return;
    }
    this.sample = null;
    this.publish({
      sharingStatus: "location_unavailable",
      permissionStatus:
        this.state.permissionStatus === "prompt"
          ? "unknown"
          : this.state.permissionStatus,
      message:
        error.code === 3
          ? "GPS acquisition timed out. Waiting for a new observation; check your device location settings."
          : "GPS is unavailable. Check device location settings or Stop and Start again.",
    });
  }
  private hasObservationError() {
    return (
      this.state.sharingStatus === "location_unavailable" ||
      this.state.sharingStatus === "send_error"
    );
  }
  private schedule(generation: number) {
    if (!this.current(generation) || !this.state.active || !this.foreground())
      return;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      if (!this.current(generation) || !this.state.active || !this.foreground())
        return;
      this.schedule(generation); // Schedule from now, not from missed intervals: no catch-up.
      void this.send(generation);
    }, SEND_INTERVAL_MS);
  }
  private async send(generation: number) {
    if (
      !this.current(generation) ||
      !this.state.active ||
      !this.foreground() ||
      gp2InFlight ||
      performance.now() - this.lastAttempt < SEND_INTERVAL_MS
    )
      return;
    const sample = this.sample;
    this.sample = null; // Consume once even on failure: a failed point is never replayed.
    if (!sample || !isFreshObservation(sample.timestamp, Date.now())) {
      if (
        this.state.permissionStatus === "granted" &&
        !this.hasObservationError()
      )
        this.publish({
          sharingStatus: "acquiring_location",
          message:
            "No fresh GPS sample at this opportunity. Waiting for a new observation.",
        });
      return;
    }
    const request = new AbortController();
    this.request = request;
    gp2InFlight = true;
    this.lastAttempt = performance.now();
    this.schedule(generation);
    this.publish({
      sending: true,
      sharingStatus: "waiting_to_send",
      message: "Sending the latest location update…",
    });
    try {
      const accepted = await locationSharingService.send(
        this.context.transportId!,
        sample.body,
        request.signal,
      );
      if (
        !this.current(generation) ||
        request.signal.aborted ||
        !this.state.active ||
        !this.foreground()
      )
        return;
      this.publish({
        lastSuccessfulTransmissionAt: accepted.serverTime,
        sharingStatus:
          this.state.sharingStatus === "location_unavailable"
            ? "location_unavailable"
            : "sharing",
        message:
          this.state.sharingStatus === "location_unavailable"
            ? this.state.message
            : "The server acknowledged the last send. This does not confirm a live GPS broadcast.",
      });
    } catch (error) {
      if (!this.current(generation) || request.signal.aborted) return;
      const failure = getLocationSharingError(error);
      if (failure.terminal) {
        this.stopWith("transport_unavailable", failure.message);
        this.rejectedRevision = this.context.revision;
        this.publish({ restartBlocked: true });
      } else {
        this.sample = null; // Discard samples collected during a failed network request too.
        this.acquiredAfter = Date.now();
        this.publish({ sharingStatus: "send_error", message: failure.message });
      }
      if (failure.refresh) this.context.onReload();
    } finally {
      gp2InFlight = false; // Also release when an old generation's aborted request finally settles.
      if (this.request === request) {
        this.request = null;
      }
      if (this.current(generation)) this.publish({ sending: false });
    }
  }
  private denied(generation: number) {
    if (!this.current(generation) || !this.state.active) return;
    const canNotify = this.foreground();
    this.release();
    this.publish({
      active: false,
      sending: false,
      sharingStatus: "permission_denied",
      permissionStatus: "denied",
      message:
        "Location access is blocked. Open your browser's site settings, allow Location, then choose Start again.",
      notification: canNotify ? "sending" : "failed",
    });
    if (!canNotify) return; // Never queue GP3 for reconnect or background execution.
    const denialGeneration = this.generation;
    const request = new AbortController();
    this.denialRequest = request;
    void locationSharingService
      .permissionDenied(this.context.transportId!, request.signal)
      .then((result) => {
        if (this.current(denialGeneration) && !request.signal.aborted)
          this.publish({
            notification: result.notified ? "notified" : "not_notified",
          });
      })
      .catch((error) => {
        if (!this.current(denialGeneration) || request.signal.aborted) return;
        this.publish({ notification: "failed" });
        const failure = getLocationSharingError(error);
        if (failure.terminal) {
          this.stopWith(
            "permission_denied",
            `${this.state.message} ${failure.message}`,
          );
          this.rejectedRevision = this.context.revision;
          this.publish({ restartBlocked: true });
        }
        if (failure.refresh) this.context.onReload();
      })
      .finally(() => {
        if (this.denialRequest === request) this.denialRequest = null;
      });
  }
}
