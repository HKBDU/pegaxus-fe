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

const sameId = (left?: MapLocation | null, right?: MapLocation | null) =>
  Boolean(left && right && String(left.id) === String(right.id));

export function LocationMarkers({
  locations,
  selectedLocation,
  startLocation,
  endLocation,
  onSelect,
  onHover,
}: LocationMarkersProps) {
  const start = startLocation && toMapPoint(startLocation) ? startLocation : null;
  const end =
    endLocation && toMapPoint(endLocation) && !sameId(endLocation, start)
      ? endLocation
      : null;
  const marker = (location: MapLocation, variant: "default" | "start" | "end") => (
    <LocationMarker
      key={`${variant}-${location.id}`}
      location={location}
      selected={sameId(selectedLocation, location)}
      variant={variant}
      onClick={() => onSelect(location)}
      onHover={(hovered) => onHover(hovered ? location : null)}
    />
  );

  // Map markers stack in DOM order, so the start and end are drawn last (and with a higher z-index) to stay on top of
  // the other locations. They are drawn from their own props, so they show even when they are not in `locations`.
  return (
    <>
      {locations.map((location) =>
        !toMapPoint(location) || sameId(location, start) || sameId(location, end)
          ? null
          : marker(location, "default"),
      )}
      {end ? marker(end, "end") : null}
      {start ? marker(start, "start") : null}
    </>
  );
}
