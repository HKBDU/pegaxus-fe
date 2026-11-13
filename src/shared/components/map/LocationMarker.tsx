import { Marker } from "react-map-gl/maplibre";
import { cn } from "@/lib/utils";
import type { MapLocation } from "./types";

type LocationMarkerProps = {
  location: MapLocation;
  selected?: boolean;
  variant?: "default" | "start" | "end";
  onClick: () => void;
  onHover: (hovered: boolean) => void;
};

const ENDPOINT_LABELS = { start: "Start", end: "End" } as const;

export function LocationMarker({
  location,
  selected,
  variant = "default",
  onClick,
  onHover,
}: LocationMarkerProps) {
  const isEndpoint = variant !== "default";

  return (
    <Marker
      latitude={location.latitude}
      longitude={location.longitude}
      anchor="bottom"
      // Keep the start and end above every other marker.
      style={isEndpoint ? { zIndex: variant === "start" ? 3 : 2 } : undefined}
    >
      <div className="flex flex-col items-center gap-1">
        {isEndpoint ? (
          <span className="pointer-events-none inline-flex items-center gap-1 rounded-full bg-white/95 px-1.5 py-0.5 text-[10px] font-medium leading-none text-slate-700 shadow-[0_1px_4px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/5 backdrop-blur-sm">
            <span
              className={cn(
                "size-1.5 rounded-full",
                variant === "start" ? "bg-emerald-500" : "bg-rose-500",
              )}
            />
            {ENDPOINT_LABELS[variant]}
          </span>
        ) : null}
        <button
          type="button"
          // E2E tests target the start and end markers by this attribute.
          data-marker-variant={variant}
          className={cn(
            "rounded-full border-2 border-white transition-transform duration-150 hover:scale-110 focus-visible:outline-none",
            isEndpoint
              ? "size-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.35)] ring-4"
              : "size-4 shadow focus-visible:ring-2",
            // The soft halo marks the endpoint; it deepens on keyboard focus.
            variant === "start" && "bg-emerald-500 ring-emerald-500/20 focus-visible:ring-emerald-500/45",
            variant === "end" && "bg-rose-500 ring-rose-500/20 focus-visible:ring-rose-500/45",
            variant === "default" && "bg-amber-600 focus-visible:ring-amber-500",
            selected && "scale-110",
            selected && variant === "default" && "bg-slate-900",
          )}
          // Same label for every marker: the route-plan E2E test matches it to find the start and end by name.
          aria-label={`Show details for ${location.name}`}
          aria-pressed={selected}
          onClick={onClick}
          onMouseEnter={() => onHover(true)}
          onMouseLeave={() => onHover(false)}
        />
      </div>
    </Marker>
  );
}
