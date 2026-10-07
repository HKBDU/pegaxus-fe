import { Marker } from "react-map-gl/maplibre";
import { cn } from "@/lib/utils";
import type { MapLocation } from "./types";

type LocationMarkerProps = {
  location: MapLocation;
  selected?: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
};

export function LocationMarker({
  location,
  selected,
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
          "size-4 rounded-full border-2 border-white bg-amber-600 shadow transition-transform hover:scale-125 focus-visible:ring-2 focus-visible:ring-amber-500",
          selected && "scale-125 bg-slate-900",
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
