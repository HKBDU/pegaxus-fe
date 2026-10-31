import { Navigation } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import type { LocationSharingState } from "../types";
import { LocationSharingStatus } from "./LocationSharingDetails";

const feedbackLabels = {
  stopped: null,
  requesting_permission: "Requesting permission",
  acquiring_location: "Locating…",
  waiting_to_send: "Waiting to send",
  paused: "Paused",
  sharing: null,
  offline: "Offline",
  permission_denied: "Permission denied",
  location_unavailable: "GPS unavailable",
  unsupported: "GPS unsupported",
  transport_unavailable: "Journey unavailable",
  send_error: "Send failed",
};

export function LocationSharingControl({
  state,
  canStart,
  unavailableReason,
  contextMessage,
  onStart,
  onStop,
}: {
  state: LocationSharingState;
  canStart: boolean;
  unavailableReason?: string;
  contextMessage?: string;
  onStart: () => void;
  onStop: () => void;
}) {
  const label = state.active ? "Turn off GPS" : "Turn on GPS";
  const feedback = state.active
    ? state.networkStatus === "offline"
      ? "Offline"
      : state.sending
        ? "Sending…"
        : feedbackLabels[state.sharingStatus]
    : (unavailableReason ??
      (state.restartBlocked
        ? "Reload required"
        : feedbackLabels[state.sharingStatus]) ??
      (!canStart ? "GPS unavailable" : null));

  return (
    <>
      <Button
        type="button"
        disabled={!state.active && !canStart}
        onClick={state.active ? onStop : onStart}
        onClickCapture={(event) => {
          // Shared Button throttles clicks for 400ms. Stop must never be throttled.
          if (state.active) {
            event.stopPropagation();
            onStop();
          }
        }}
        aria-label={label}
        aria-pressed={state.active}
        aria-describedby="location-sharing-status"
        className="location-sharing-toggle min-h-16 w-full rounded-xs px-4 py-3 text-base whitespace-normal disabled:opacity-70"
      >
        {!state.active ? (
          <Navigation aria-hidden="true" className="size-5" />
        ) : null}
        <span className="min-w-0">
          <span className="block">{label}</span>
          {feedback ? (
            <span className="block text-sm font-normal">{feedback}</span>
          ) : null}
        </span>
      </Button>
      <LocationSharingStatus
        state={state}
        unavailableReason={unavailableReason}
        contextMessage={contextMessage}
      />
    </>
  );
}
