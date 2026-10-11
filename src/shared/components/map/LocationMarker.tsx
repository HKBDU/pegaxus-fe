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

export function LocationMarker({
  location,
  selected,
  variant = "default",
  onClick,
  onHover,
}: LocationMarkerProps) {
  return (
    <Marker
      latitude={location.latitude}
      longitude={location.longitude}
      anchor="bottom"
    >
      <button
        type="button"
        className={cn(
          "size-4 rounded-full border-2 border-white shadow transition-transform hover:scale-125 focus-visible:ring-2",
          variant === "start" && "bg-emerald-600 focus-visible:ring-emerald-500",
          variant === "end" && "bg-red-600 focus-visible:ring-red-500",
          variant === "default" && "bg-amber-600 focus-visible:ring-amber-500",
          selected && "scale-125",
          selected && variant === "default" && "bg-slate-900",
        )}
        aria-label={`Show details for ${location.name}`}
        aria-pressed={selected}
        onClick={onClick}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
      />
    </Marker>
  );
}
