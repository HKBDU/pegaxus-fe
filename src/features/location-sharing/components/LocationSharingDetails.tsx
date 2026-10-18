import { LockKeyhole, Radio, Truck } from "lucide-react";
import type { DriverTransportContext, LocationSharingState } from "../types";

const permissionLabels = {
  not_requested: "Not requested",
  prompt: "Awaiting choice",
  granted: "Granted",
  denied: "Denied",
  unknown: "Unavailable",
};

const journeyLabels = {
  READY: "Ready",
  IN_TRANSIT: "In transit",
  COMPLETED: "Completed",
};

export function LocationSharingSummary({
  state,
  journeyStatus,
}: {
  state: LocationSharingState;
  journeyStatus: DriverTransportContext["status"] | null;
}) {
  const sharingStatus = !state.active
    ? "Not sharing"
    : state.networkStatus === "offline" ||
        state.sharingStatus === "paused" ||
        state.sharingStatus === "offline"
      ? "Paused"
      : state.sharingStatus === "send_error"
        ? "Send failed"
        : state.sharingStatus === "location_unavailable"
          ? "Unavailable"
          : state.sharingStatus === "sharing" &&
              state.permissionStatus === "granted" &&
              state.lastSuccessfulTransmissionAt !== null
            ? "Sharing"
            : "Starting";
  const items = [
    { label: "Sharing status", value: sharingStatus, icon: Radio },
    {
      label: "Permission",
      value: permissionLabels[state.permissionStatus],
      icon: LockKeyhole,
    },
    {
      label: "Journey",
      value:
        journeyStatus === null ? "Unavailable" : journeyLabels[journeyStatus],
      icon: Truck,
    },
  ];

  return (
    <dl className="m-0 grid min-w-0 grid-cols-1 gap-3 border-t border-border pt-4 min-[390px]:grid-cols-3">
      {items.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="flex min-w-0 items-start justify-between gap-2 min-[390px]:block"
        >
          <dt className="flex min-w-0 items-start gap-1.5 text-xs leading-5 text-muted-foreground">
            <Icon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            <span>{label}</span>
          </dt>
          <dd className="m-0 text-sm leading-5 font-medium text-foreground min-[390px]:mt-1">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const sharingLabels = {
  stopped: "Not sharing",
  requesting_permission: "Requesting permission",
  acquiring_location: "Acquiring location",
  waiting_to_send: "Waiting for a successful send",
  paused: "Paused while page is hidden",
  sharing: "Last send acknowledged; live GPS is not confirmed",
  offline: "Sharing interrupted — offline",
  permission_denied: "Location permission denied",
  location_unavailable: "Location unavailable",
  unsupported: "Location API unavailable",
  transport_unavailable: "Transport unavailable",
  send_error: "Location update failed",
};

export function LocationSharingStatus({
  state,
  unavailableReason,
  contextMessage,
}: {
  state: LocationSharingState;
  unavailableReason?: string;
  contextMessage?: string;
}) {
  return (
    <div
      id="location-sharing-status"
      className="sr-only"
      role={state.sharingStatus === "permission_denied" ? "alert" : "status"}
      aria-atomic="true"
    >
      {state.active ? "GPS session on. " : "GPS session off. "}
      {sharingLabels[state.sharingStatus]}. {state.message} {unavailableReason}{" "}
      {contextMessage}
      {state.restartBlocked
        ? " Reload journey context before restarting."
        : null}
      {state.notification !== "none"
        ? state.notification === "sending"
          ? " Reporting permission denial."
          : state.notification === "notified"
            ? " The coordinator was notified by the server."
            : state.notification === "not_notified"
              ? " The server did not send a new notification."
              : " Coordinator notification could not be confirmed."
        : null}
    </div>
  );
}
