import {
  CirclePause,
  Clock3,
  Info,
  LockKeyhole,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { LocationSharingState } from "../types";

const sharingLabels = {
  stopped: "Not sharing",
  requesting_permission: "Requesting permission",
  acquiring_location: "Acquiring location",
  waiting_to_send: "Waiting for a successful send",
  paused: "Paused while page is hidden",
  sharing: "Last send acknowledged",
  offline: "Sharing interrupted — offline",
  permission_denied: "Location permission denied",
  location_unavailable: "Location unavailable",
  unsupported: "Location API unavailable",
  transport_unavailable: "Transport unavailable",
  send_error: "Location update failed",
};
const permissionLabels = {
  not_requested: "Not requested",
  prompt: "Awaiting your choice",
  granted: "Allowed",
  denied: "Blocked",
  unknown: "Unknown",
};

export function LocationSharingStatus({
  state,
}: {
  state: LocationSharingState;
}) {
  const NetworkIcon = state.networkStatus === "offline" ? WifiOff : Wifi;
  const rows = [
    {
      label: "Transmission",
      value: state.sending
        ? "Sending current location"
        : state.active
          ? "Waiting for a fresh send opportunity"
          : "Not sending",
      icon: Clock3,
    },
    {
      label: "Sharing status",
      value: sharingLabels[state.sharingStatus],
      icon: CirclePause,
    },
    {
      label: "Location permission",
      value: permissionLabels[state.permissionStatus],
      icon: LockKeyhole,
    },
    {
      label: "Device network",
      value:
        state.networkStatus === "online"
          ? "Online — server connection not confirmed"
          : state.networkStatus === "offline"
            ? "Offline"
            : "Checking availability",
      icon: NetworkIcon,
    },
    {
      label: "Last successful send",
      value:
        state.lastSuccessfulTransmissionAt === null
          ? "No location has been sent"
          : new Intl.DateTimeFormat(undefined, {
              dateStyle: "medium",
              timeStyle: "medium",
            }).format(new Date(state.lastSuccessfulTransmissionAt)),
      icon: Clock3,
    },
  ];
  return (
    <section
      className="location-sharing-panel"
      aria-labelledby="location-status-title"
    >
      <h2 id="location-status-title" className="location-sharing-heading">
        Location &amp; connection
      </h2>
      <dl
        className="mt-4 mb-0 divide-y divide-border"
        aria-live="polite"
        aria-atomic="true"
      >
        {rows.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
          >
            <Icon
              aria-hidden="true"
              className="mt-1 size-4 shrink-0 text-slate-500"
            />
            <div className="min-w-0">
              <dt className="text-slate-500">{label}</dt>
              <dd className="mt-1 mb-0 font-medium break-words text-slate-900">
                {value}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function LocationPermissionGuidance() {
  return (
    <section
      className="location-sharing-panel"
      aria-labelledby="location-guidance-title"
    >
      <h2 id="location-guidance-title" className="location-sharing-heading">
        <Info aria-hidden="true" className="size-4 text-primary" />
        Before you share
      </h2>
      <ul className="mt-4 mb-0 list-disc space-y-3 pl-5 leading-relaxed text-slate-700">
        <li>
          Location is requested only after you choose Start. If access is
          blocked, open your browser's site settings and allow Location, then
          choose Start again.
        </li>
        <li>
          Use a secure HTTPS connection. Localhost can be treated as secure by
          the browser for development.
        </li>
        <li>
          Keep this page visible. Switching apps, hiding the page or locking the
          screen pauses collection and sending. Returning online to this page
          resumes acquisition of a new position within your started session.
        </li>
        <li>
          There is no offline queue or replay. Missing updates are discarded;
          reconnecting requires a fresh position, not an invented path. Browser
          suspension can delay updates; background tracking is not guaranteed.
        </li>
      </ul>
    </section>
  );
}
