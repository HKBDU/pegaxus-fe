import { CirclePause, Navigation, ShieldCheck, Square } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import type { LocationSharingState } from "../types";

export function LocationSharingControl({
  state,
  canStart,
  onStart,
  onStop,
}: {
  state: LocationSharingState;
  canStart: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  return (
    <section
      className="location-sharing-panel"
      aria-labelledby="sharing-control-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 basis-44 items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xs bg-primary/10 text-primary">
            <Navigation aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 id="sharing-control-title" className="location-sharing-heading">
              Share journey location
            </h2>
          </div>
        </div>
        <Badge
          variant="outline"
          className="shrink-0 rounded-xs border-slate-300 bg-slate-50 text-slate-700"
        >
          <CirclePause aria-hidden="true" />
          {state.active ? "Sharing session on" : "Not sharing"}
        </Badge>
      </div>
      <p className="mt-3 mb-0 leading-relaxed text-slate-600">
        Keep operations informed about your journey, without a separate GPS
        device.
      </p>
      <Button
        type="button"
        disabled={!state.active && !canStart}
        onClick={state.active ? onStop : onStart}
        variant={state.active ? "destructive" : "default"}
        aria-describedby="sharing-operation-note"
        className="mt-5 min-h-16 w-full rounded-xs px-4 py-3 text-base whitespace-normal disabled:opacity-70"
      >
        {state.active ? (
          <Square aria-hidden="true" className="size-5" />
        ) : (
          <Navigation aria-hidden="true" className="size-5" />
        )}
        {state.active ? "Stop Sharing" : "Start Sharing"}
      </Button>
      <p
        id="sharing-operation-note"
        className="mt-3 mb-0 leading-relaxed text-slate-700"
      >
        {state.active
          ? "Only fresh GPS observations are sent, at most once per 15-second opportunity. Stop ends collection and sending."
          : "Choose Start to request browser location access. Sharing never starts automatically after a page reload. A real IN_TRANSIT journey is required."}
      </p>
      {state.message ? (
        <div
          role={
            state.sharingStatus === "permission_denied" ? "alert" : "status"
          }
          className={`location-sharing-notice mt-4 ${state.sharingStatus === "permission_denied" ? "border-red-300 bg-red-50 text-red-900" : "border-slate-200 bg-slate-50 text-slate-800"}`}
        >
          {state.message}
        </div>
      ) : null}
      {state.notification !== "none" ? (
        <p role="status" className="mt-3 mb-0 leading-relaxed text-slate-700">
          {state.notification === "sending"
            ? "Reporting the permission denial…"
            : state.notification === "notified"
              ? "The coordinator was notified by the server."
              : state.notification === "not_notified"
                ? "The server did not send a new notification. A cooldown or unavailable recipient may apply."
                : "Coordinator notification could not be confirmed. No automatic retry is queued."}
        </p>
      ) : null}
      <p className="mt-4 mb-0 flex items-start gap-2 border-t border-border pt-3 text-slate-500">
        <ShieldCheck aria-hidden="true" className="mt-1 size-4 shrink-0" />
        For your safety, only operate this screen while parked.
      </p>
    </section>
  );
}
