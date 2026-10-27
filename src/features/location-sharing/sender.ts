import { canAccess } from "@/features/auth/access-control";
import { useAuthStore } from "@/features/auth/store";
import { getLocationSharingError, locationSharingService } from "./services";
import {
  locationFromPosition,
  isFreshObservation,
  SEND_INTERVAL_MS,
} from "./position";
import type { DriverLocationRequest, LocationSharingState } from "./types";
import { distanceMeters } from "@/features/handover/utils";

export const ARRIVAL_WARN_METERS = 400;

type SenderContext = {
  transportId?: string;
  accountId?: string;
  sessionVersion: number;
  eligible: boolean;
  revision?: string;
  segmentId?: string;
  onReload: () => void;
};

// A second mounted sender cannot own GPS or overlap a still-settling GP2 request.
let owner: LocationSender | null = null;
let gp2InFlight = false;

export const createStoppedLocationSharingState = (): LocationSharingState => ({
  sharingStatus: "stopped",
  permissionStatus: "not_requested",
  networkStatus: "unknown",
  lastSuccessfulTransmissionAt: null,
  active: false,
  sending: false,
  restartBlocked: false,
  message: null,
  notification: "none",
  acceptance: "unknown",
  lastAcceptedAt: null,
  acceptedSegmentId: null,
  acceptanceScope: null,
  arrival: null,
  arrivalWarning: null,
});

export class LocationSender {
  private state = createStoppedLocationSharingState();
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
  private latestPosition: {
    body: DriverLocationRequest;
    timestamp: number;
  } | null = null;
  private seenArrivals = new Set<string>();
  private previousDistance: number | null = null;

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
    const previousSegmentId = this.context.segmentId;
    const changed =
      this.context.transportId !== context.transportId ||
      this.context.accountId !== context.accountId ||
      this.context.sessionVersion !== context.sessionVersion ||
      this.context.segmentId !== context.segmentId;
    const newVisit =
      this.context.transportId !== context.transportId ||
      this.context.accountId !== context.accountId ||
      this.context.sessionVersion !== context.sessionVersion;
    this.context = context;
    if (changed && newVisit) {
      this.release();
      if (newVisit) this.seenArrivals.clear();
      this.state = createStoppedLocationSharingState();
      this.publish({ networkStatus: navigator.onLine ? "online" : "offline" });
    } else if (changed) {
      const arrival = this.state.arrival;
      const continuingExemptArrival =
        arrival?.handoverRequired === false &&
        arrival.fromRoutePlanRouteId === previousSegmentId &&
        arrival.toRoutePlanRouteId === context.segmentId;
      if (!continuingExemptArrival) this.dismissArrival();
      this.request?.abort();
      this.sample = null;
      this.acquiredAfter = Date.now();
      if (!continuingExemptArrival) this.latestPosition = null;
      this.publish({
        lastAcceptedAt: null,
        acceptedSegmentId: null,
        acceptance:
          this.state.acceptance === "rejected" && !context.eligible
            ? "rejected"
            : "unknown",
      });
    }
    if (!this.authorized() && (this.state.active || this.denialRequest)) {
      this.stopWith(
        "transport_unavailable",
        "Journey context or authorization changed. Reload before starting again.",
      );
    }
    if (
      this.state.restartBlocked &&
      this.authorized() &&
      context.revision !== this.rejectedRevision &&
      this.state.acceptance !== "rejected"
    ) {
      this.publish({ restartBlocked: false });
    }
  }
  private authorized() {
    if (this.context.transportId === "demo") return true;
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
  dismissArrival = () => {
    this.previousDistance = null;
    this.publish({ arrival: null, arrivalWarning: null });
  };
  freshPosition = () => {
    const position = this.latestPosition;
    return this.authorized() &&
      this.state.active &&
      this.foreground() &&
      position &&
      isFreshObservation(position.timestamp, Date.now())
      ? position.body
      : null;
  };
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
      lastAcceptedAt: null,
      acceptedSegmentId: null,
      arrival: null,
      arrivalWarning: null,
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
    this.latestPosition = null;
    this.previousDistance = null;
    this.publish({
      lastAcceptedAt: null,
      acceptedSegmentId: null,
      arrival: null,
      arrivalWarning: null,
    });
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
    this.latestPosition = this.sample;
    this.updateArrivalDistance(body);
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
    this.latestPosition = null;
    this.dismissArrival();
    this.publish({ lastAcceptedAt: null, acceptedSegmentId: null });
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
    const segmentId = this.context.segmentId;
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
        !this.foreground() ||
        segmentId !== this.context.segmentId
      )
        return;
      if (accepted.accepted === false) {
        this.stopWith(
          "stopped",
          accepted.reason === "NOT_CURRENT_SEGMENT_DRIVER"
            ? "Bạn đã bàn giao chặng này. Định vị đã tự động dừng."
            : "Máy chủ không nhận vị trí cho chặng hiện tại. Định vị đã dừng.",
        );
        this.publish({ acceptance: "rejected", restartBlocked: true });
        this.rejectedRevision = this.context.revision;
        this.context.onReload();
        return;
      }
      this.publish({
        lastSuccessfulTransmissionAt: accepted.serverTime,
        acceptance: accepted.accepted === true ? "accepted" : "legacy",
        lastAcceptedAt: accepted.accepted === true ? Date.now() : null,
        acceptedSegmentId:
          accepted.accepted === true ? (this.context.segmentId ?? null) : null,
        acceptanceScope:
          accepted.accepted === true
            ? {
                transportId: this.context.transportId!,
                accountId: this.context.accountId!,
                sessionVersion: this.context.sessionVersion,
              }
            : null,
        sharingStatus:
          this.state.sharingStatus === "location_unavailable"
            ? "location_unavailable"
            : "sharing",
        message:
          this.state.sharingStatus === "location_unavailable"
            ? this.state.message
            : "The server acknowledged the last send. This does not confirm a live GPS broadcast.",
      });
      if (accepted.accepted === true && accepted.arrival) {
        const event = accepted.arrival;
        const key = JSON.stringify([
          this.context.transportId,
          event.boundaryNo,
          event.fromRoutePlanRouteId,
          event.toRoutePlanRouteId,
        ]);
        if (!this.seenArrivals.has(key)) {
          this.seenArrivals.add(key);
          this.previousDistance = null;
          this.publish({ arrival: event, arrivalWarning: null });
          if (this.latestPosition)
            this.updateArrivalDistance(this.latestPosition.body);
        }
        // Only exempt arrivals change timestamps at GP2; required handovers wait for HO5.
        if (!event.handoverRequired) this.context.onReload();
      }
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
  private updateArrivalDistance(body: DriverLocationRequest) {
    const arrival = this.state.arrival;
    if (!arrival) return;
    const distance = distanceMeters(body, arrival.location);
    if (!Number.isFinite(distance)) return;
    if (distance > arrival.radiusMeters) {
      this.dismissArrival();
      return;
    }
    const outward =
      this.previousDistance !== null && distance > this.previousDistance;
    this.previousDistance = distance;
    const speed =
      body.speedKmh !== undefined && body.speedKmh !== null
        ? body.speedKmh / 3.6
        : null;
    this.publish({
      arrivalWarning:
        outward && distance >= ARRIVAL_WARN_METERS
          ? {
              distanceMeters: Math.round(distance),
              secondsRemaining:
                speed !== null && Number.isFinite(speed) && speed > 0
                  ? Math.ceil((arrival.radiusMeters - distance) / speed)
                  : null,
            }
          : null,
    });
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
