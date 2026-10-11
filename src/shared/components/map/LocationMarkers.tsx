import { toMapPoint } from "@/shared/utils/map";
import { LocationMarker } from "./LocationMarker";
import type { MapLocation } from "./types";

type LocationMarkersProps = {
  locations: MapLocation[];
  selectedLocation: MapLocation | null;
  onSelect: (location: MapLocation) => void;
  onHover: (location: MapLocation | null) => void;
};

export function LocationMarkers({
  locations,
  selectedLocation,
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
            onClick={() => onSelect(location)}
            onHover={(hovered) => onHover(hovered ? location : null)}
          />
        );
      })}
    </>
  );
}
