import type { RouteGeometry } from "@/shared/utils/map";

export type MapLocation = {
  id: string | number;
  name: string;
  type?: string | null;
  country?: string | null;
  address?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  latitude: number;
  longitude: number;
  note?: string | null;
};

export type LocationAction = "EDIT" | "DELETE";
export type SelectionMode = "ADD_LOCATION" | "FROM_LOCATION" | "TO_LOCATION";

export type MapRoute = {
  id: string | number;
  name?: string | null;
  geometry?: unknown;
  geoJson?: unknown;
  fromLocation?: MapLocation | null;
  toLocation?: MapLocation | null;
};

export type LocationFormValues = {
  name: string;
  type: string;
  address: string;
  city: string;
  stateProvince: string;
  country: string;
  latitude: number;
  longitude: number;
  note: string;
};

export type LocationFormPayload = Omit<LocationFormValues, "type"> & {
  type?: string;
};

export type RouteFormValues = {
  fromLocationId: string;
  toLocationId: string;
  routeName: string;
  transportMode: "ROAD" | "SEA" | "AIR";
  note: string;
};

export type MapViewerProps = {
  locations: MapLocation[];
  route?: MapRoute | null;
  routeGeoJson?: unknown;
  styleUrl?: string;
  loading?: boolean;
  error?: string | null;
  canEditLocation?: boolean;
  canDeleteLocation?: boolean;
  showSearch?: boolean;
  searchOptions?: MapLocation[];
  searchLoading?: boolean;
  searchEmptyMessage?: string;
  onSearchChange?: (value: string) => void;
  onLocationSelect?: (location: MapLocation) => void;
  onLocationHover?: (location: MapLocation | null) => void;
  onMapClick?: (point: { latitude: number; longitude: number }) => void;
  onMarkerAction?: (action: LocationAction, location: MapLocation) => void;
  onRouteSelect?: (route: MapRoute) => void;
};

export type ValidatedRouteGeometry = RouteGeometry | null;
