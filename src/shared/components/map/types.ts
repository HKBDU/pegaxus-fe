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
  /** Raw server concurrency token. Keep fractional-second precision intact. */
  updatedAt?: string | null;
};

export type LocationAction = "EDIT" | "DELETE";
export type MapMode = "view" | "addLocation" | "addRoute" | "buildPlan";
/** @deprecated Use MapMode. Kept as a source-compatible alias for consumers. */
export type SelectionMode = MapMode;

export type MapRoute = {
  id: string | number;
  routePlanRouteId?: string;
  name?: string | null;
  geometry?: unknown;
  geoJson?: unknown;
  fromLocation?: MapLocation | null;
  toLocation?: MapLocation | null;
  transportMode?: "ROAD" | "SEA" | "AIR";
  distanceKm?: number | null;
  durationMinutes?: number | null;
  /** Raw server concurrency token. Keep fractional-second precision intact. */
  updatedAt?: string | null;
  source?: "saved" | "preview";
  routePlanType?: "PRIMARY" | "BACKUP" | "RETURN";
  isOutsourced?: boolean;
  readonly?: boolean;
};

export type MapPoint = { latitude: number; longitude: number };

export type MapRoutePreview = {
  geometry: unknown;
  distanceKm: number;
  durationMinutes: number;
  error?: string | null;
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
  routes?: MapRoute[];
  routeGeoJson?: unknown;
  preview?: MapRoutePreview | null;
  mode?: MapMode;
  onModeChange?: (mode: MapMode) => void;
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
  onMarkerSelect?: (location: MapLocation) => void;
  onLocationHover?: (location: MapLocation | null) => void;
  onMapClick?: (point: MapPoint) => void;
  onRoutePointSelect?: (point: MapPoint, location?: MapLocation) => void;
  onMarkerAction?: (action: LocationAction, location: MapLocation) => void;
  onRouteSelect?: (route: MapRoute) => void;
  buildStartLocation?: MapLocation | null;
  buildEndLocation?: MapLocation | null;
};

export type ValidatedRouteGeometry = RouteGeometry | null;
