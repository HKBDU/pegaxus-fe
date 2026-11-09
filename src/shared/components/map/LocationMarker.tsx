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
      <div className="flex flex-col items-center gap-0.5">
        {isEndpoint ? (
          <span
            className={cn(
              "pointer-events-none rounded-[2px] px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none text-white shadow",
              variant === "start" ? "bg-emerald-600" : "bg-red-600",
            )}
          >
            {ENDPOINT_LABELS[variant]}
          </span>
        ) : null}
        <button
          type="button"
          className={cn(
            "rounded-full border-2 border-white shadow transition-transform hover:scale-125 focus-visible:ring-2",
            isEndpoint ? "size-5 ring-2" : "size-4",
            variant === "start" && "bg-emerald-600 ring-emerald-600/40 focus-visible:ring-emerald-500",
            variant === "end" && "bg-red-600 ring-red-600/40 focus-visible:ring-red-500",
            variant === "default" && "bg-amber-600 focus-visible:ring-amber-500",
            selected && "scale-125",
            selected && variant === "default" && "bg-slate-900",
          )}
          aria-label={
            isEndpoint
              ? `${ENDPOINT_LABELS[variant]} point: ${location.name}`
              : `Show details for ${location.name}`
          }
          aria-pressed={selected}
          onClick={onClick}
          onMouseEnter={() => onHover(true)}
          onMouseLeave={() => onHover(false)}
        />
      </div>
    </Marker>
  );
}
