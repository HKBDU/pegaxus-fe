import { CirclePause, Navigation, ShieldCheck } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";

export function LocationSharingControl() {
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
          Inactive
        </Badge>
      </div>
      <p className="mt-3 mb-0 leading-relaxed text-slate-600">
        Keep operations informed about your journey, without a separate GPS
        device.
      </p>
      <Button
        type="button"
        disabled
        aria-describedby="phase-one-sharing-note"
        className="mt-5 min-h-16 w-full rounded-xs px-4 py-3 text-base whitespace-normal disabled:opacity-70"
      >
        <Navigation aria-hidden="true" className="size-5" />
        Share Journey Location
      </Button>
      <p
        id="phase-one-sharing-note"
        className="mt-3 mb-0 leading-relaxed text-slate-700"
      >
        Location sharing is not available in Phase 1. This page does not request
        GPS access, collect coordinates or send location updates.
      </p>
      <p className="mt-4 mb-0 flex items-start gap-2 border-t border-border pt-3 text-slate-500">
        <ShieldCheck aria-hidden="true" className="mt-1 size-4 shrink-0" />
        For your safety, only operate this screen while parked.
      </p>
    </section>
  );
}
