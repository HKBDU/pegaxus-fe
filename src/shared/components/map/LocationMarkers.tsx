import { toMapPoint } from "@/shared/utils/map";
import { LocationMarker } from "./LocationMarker";
import type { MapLocation } from "./types";

type LocationMarkersProps = {
  locations: MapLocation[];
  selectedLocation: MapLocation | null;
  startLocation?: MapLocation | null;
  endLocation?: MapLocation | null;
  onSelect: (location: MapLocation) => void;
  onHover: (location: MapLocation | null) => void;
};

export function LocationMarkers({
  locations,
  selectedLocation,
  startLocation,
  endLocation,
  onSelect,
  onHover,
}: LocationMarkersProps) {
  return (
    <>
      {locations.map((location) => {
        if (!toMapPoint(location)) return null;
        return (
          <LocationMarker
            key={location.id}
            location={location}
            selected={selectedLocation?.id === location.id}
            variant={
              String(startLocation?.id) === String(location.id)
                ? "start"
                : String(endLocation?.id) === String(location.id)
                  ? "end"
                  : "default"
            }
            onClick={() => onSelect(location)}
            onHover={(hovered) => onHover(hovered ? location : null)}
          />
        );
      })}
    </>
  );
}
