import { useEffect, useMemo, useRef, useState } from "react";
import { isAxiosError } from "axios";
import apiClient from "@/lib/axios";
import { toast } from "sonner";
import { MapPin, Plus, Route as RouteIcon, Trash2 } from "lucide-react";
import {
  MapViewer,
  AddLocationForm,
  EditLocationForm,
  RouteForm,
  type MapLocation,
  type MapRoute,
  type LocationFormPayload,
  type LocationFormValues,
  type RouteFormValues,
} from "@/shared/components/map";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  reverseGeocodeGeoapify,
  searchNearbyGeoapifyPlaces,
  type GeoapifyPlace,
} from "@/shared/utils/map";
import { previewGeoapifyRoute } from "@/shared/utils/map/routing";
import { clearRouteGeometryMemory } from "@/shared/components/map/route-geometry-cache";
import type {
  LocationCreateResponse,
  LocationListResponse,
  LocationMutationResponse,
  LocationResponse,
  RouteListResponse,
  RouteMutationResponse,
  RouteResponse,
} from "@/features/route-plan/types";

const LOCATION_SEARCH_CATEGORIES = [
  "airport",
  "pet.animal_boarding",
  "sport.horse_riding",
  "pet.veterinary",
].join(",");

const EU_COUNTRY_CODES = new Set([
  "at",
  "be",
  "bg",
  "hr",
  "cy",
  "cz",
  "dk",
  "ee",
  "fi",
  "fr",
  "de",
  "gr",
  "hu",
  "ie",
  "it",
  "lv",
  "lt",
  "lu",
  "mt",
  "nl",
  "pl",
  "pt",
  "ro",
  "sk",
  "si",
  "es",
  "se",
]);

const EU_SEARCH_RECT = "rect:-31,71,45,34";

async function searchGeoapifyLocationPlaces(
  query: string,
  signal: AbortSignal,
): Promise<GeoapifyPlace[]> {
  const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
  if (!apiKey) throw new Error("Geoapify API key is not configured.");

  const params = new URLSearchParams({
    categories: LOCATION_SEARCH_CATEGORIES,
    filter: EU_SEARCH_RECT,
    name: query,
    limit: "20",
    lang: "en",
    apiKey,
  });
  const response = await fetch(
    `https://api.geoapify.com/v2/places?${params.toString()}`,
    { signal },
  );
  if (!response.ok) {
    throw new Error("Không thể tìm địa điểm trên Geoapify.");
  }

  const body = (await response.json()) as {
    features?: Array<{ properties?: Record<string, unknown> }>;
  };
  return (body.features ?? []).flatMap((feature) => {
    const properties = feature.properties;
    const countryCode =
      typeof properties?.country_code === "string"
        ? properties.country_code.toLowerCase()
        : "";
    if (!EU_COUNTRY_CODES.has(countryCode)) return [];
    const latitude = Number(properties?.lat);
    const longitude = Number(properties?.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    return [
      {
        name: typeof properties?.name === "string" ? properties.name : null,
        address:
          typeof properties?.formatted === "string"
            ? properties.formatted
            : null,
        city: typeof properties?.city === "string" ? properties.city : null,
        stateProvince:
          typeof properties?.state === "string" ? properties.state : null,
        country:
          typeof properties?.country === "string" ? properties.country : null,
        countryCode: countryCode || null,
        latitude,
        longitude,
      } satisfies GeoapifyPlace,
    ];
  });
}

function toMapLocation(item: LocationResponse): MapLocation {
  return {
    id: item.locationId,
    name: item.locationName,
    type: item.locationType,
    address: item.address,
    city: item.city,
    stateProvince: item.stateProvince,
    country: item.country,
    latitude: Number(item.latitude),
    longitude: Number(item.longitude),
    note: item.locationNote,
    updatedAt: item.updatedAt ?? item.lastUpdatedAt,
  };
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError(error)) return fallback;
  const data = error.response?.data as
    { message?: string; errorCode?: string; traceId?: string } | undefined;
  const details = [
    data?.errorCode,
    data?.message,
    data?.traceId ? `traceId: ${data.traceId}` : undefined,
  ].filter(Boolean);
  return details.length > 0
    ? details.join(" — ")
    : `${fallback} (HTTP ${error.response?.status ?? "unknown"})`;
}

function toMapRoute(item: RouteResponse): MapRoute | null {
  const fromLocation = toMapLocation(item.fromLocation);
  const toLocation = toMapLocation(item.toLocation);
  if (!fromLocation || !toLocation) return null;
  return {
    id: item.routeId,
    name: item.routeName ?? `${fromLocation.name} to ${toLocation.name}`,
    transportMode: item.transportMode ?? "ROAD",
    fromLocation,
    toLocation,
    distanceKm: item.distanceKm,
    durationMinutes: item.estimatedDurationMinutes,
    updatedAt: item.updatedAt,
  };
}

async function loadLocations(): Promise<MapLocation[]> {
  const pageSize = 100;
  const locations: LocationResponse[] = [];
  let pageIndex = 1;

  while (pageIndex <= 1000) {
    const response = (await apiClient.get("/locations", {
      params: { pageIndex, pageSize },
    })) as unknown as LocationListResponse;
    const items = response.value?.items ?? response.items ?? [];
    locations.push(...items);

    const totalPages = response.value?.totalPages ?? response.totalPages;
    const hasNextPage = response.value?.hasNextPage ?? response.hasNextPage;
    if (
      hasNextPage === false ||
      (totalPages !== undefined && pageIndex >= totalPages)
    ) {
      break;
    }
    if (
      items.length < pageSize &&
      totalPages === undefined &&
      hasNextPage === undefined
    ) {
      break;
    }
    pageIndex += 1;
  }

  return locations.filter((item) => !item.isDeleted).map(toMapLocation);
}

async function loadRoutes(): Promise<MapRoute[]> {
  const response = (await apiClient.get("/routes", {
    params: { pageIndex: 1, pageSize: 100 },
  })) as unknown as RouteListResponse;
  const items = response.value?.items ?? response.items ?? [];
  return items.flatMap((item) => {
    const route = toMapRoute(item);
    return route ? [route] : [];
  });
}

async function reloadRoutes(setRoutes: (routes: MapRoute[]) => void) {
  clearRouteGeometryMemory();
  const data = await loadRoutes();
  setRoutes(data);
  return data;
}

const locationFormValues = (location: MapLocation): LocationFormValues => ({
  name: location.name,
  type: location.type ?? "OTHER",
  address: location.address ?? "",
  city: location.city ?? "",
  stateProvince: location.stateProvince ?? "",
  country: location.country ?? "",
  latitude: location.latitude,
  longitude: location.longitude,
  note: location.note ?? "",
});

const routeFormValues = (route: MapRoute): RouteFormValues => ({
  fromLocationId: String(route.fromLocation?.id ?? ""),
  toLocationId: String(route.toLocation?.id ?? ""),
  routeName: route.name ?? "",
  transportMode: route.transportMode ?? "ROAD",
  note: "",
});

function straightLineGeometry(from: MapLocation, to: MapLocation) {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: [
        [from.longitude, from.latitude],
        [to.longitude, to.latitude],
      ],
    },
  };
}

export default function MapAssetsPage() {
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [routes, setRoutes] = useState<MapRoute[]>([]);
  const [locationEditor, setLocationEditor] = useState<{
    mode: "add" | "edit";
    location?: MapLocation;
  } | null>(null);
  const [routeEditor, setRouteEditor] = useState<{
    mode: "add" | "edit";
    route?: MapRoute;
  } | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<
    string | number | null
  >(null);
  const [mapMode, setMapMode] = useState<"view" | "addLocation" | "addRoute">(
    "view",
  );
  const [routePoints, setRoutePoints] = useState<MapLocation[]>([]);
  const [searchOptions, setSearchOptions] = useState<MapLocation[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<GeoapifyPlace[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [pickedPoint, setPickedPoint] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const nearbyAbort = useRef<AbortController | null>(null);
  const searchAbort = useRef<AbortController | null>(null);
  const routeAbort = useRef<AbortController | null>(null);
  const [routePreview, setRoutePreview] = useState<{
    geometry: unknown;
    distanceKm: number;
    durationMinutes: number;
  } | null>(null);

  useEffect(() => {
    void Promise.all([loadLocations(), loadRoutes()])
      .then(([locationData, routeData]) => {
        setLocations(locationData);
        setSearchOptions(locationData);
        setRoutes(routeData);
      })
      .catch((error) =>
        toast.error(
          getApiErrorMessage(error, "Không thể tải dữ liệu Location/Route."),
        ),
      );
  }, []);

  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === selectedRouteId),
    [routes, selectedRouteId],
  );

  function placeToLocation(
    place: GeoapifyPlace,
    fallbackId: string,
  ): MapLocation {
    return {
      id: fallbackId,
      name: place.name || place.address || "Untitled location",
      address: place.address,
      city: place.city,
      stateProvince: place.stateProvince,
      country: place.countryCode || place.country,
      latitude: place.latitude,
      longitude: place.longitude,
    };
  }

  async function handleSearchChange(query: string) {
    searchAbort.current?.abort();
    searchAbort.current = null;

    if (mapMode === "addLocation") {
      const normalizedQuery = query.trim();
      if (!normalizedQuery) {
        setSearchOptions([]);
        setSearchLoading(false);
        return;
      }

      const controller = new AbortController();
      searchAbort.current = controller;
      setSearchLoading(true);
      try {
        const places = await searchGeoapifyLocationPlaces(
          normalizedQuery,
          controller.signal,
        );
        setSearchOptions(
          places.map((place, index) =>
            placeToLocation(
              place,
              `geoapify-${place.latitude}-${place.longitude}-${index}`,
            ),
          ),
        );
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSearchOptions([]);
          toast.error(
            error instanceof Error
              ? error.message
              : "Không thể tìm địa điểm trên Geoapify.",
          );
        }
      } finally {
        if (searchAbort.current === controller) {
          searchAbort.current = null;
          setSearchLoading(false);
        }
      }
      return;
    }

    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      setSearchOptions(locations);
      setSearchLoading(false);
      return;
    }

    setSearchOptions(
      locations.filter((location) =>
        [
          location.name,
          location.address,
          location.city,
          location.stateProvince,
          location.country,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery)),
      ),
    );
    setSearchLoading(false);
  }

  async function handleMapClick(point: {
    latitude: number;
    longitude: number;
  }) {
    if (mapMode !== "addLocation") return;
    nearbyAbort.current?.abort();
    nearbyAbort.current = new AbortController();
    setPickedPoint(point);
    setNearbyLoading(true);
    setNearbyPlaces([]);
    setNearbyError(null);
    setNearbyOpen(true);
    setMapMode("view");
    try {
      setNearbyPlaces(
        await searchNearbyGeoapifyPlaces(point, nearbyAbort.current.signal),
      );
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setNearbyError(
          error instanceof Error
            ? error.message
            : "Không thể tìm POI gần điểm đã chọn.",
        );
      }
    } finally {
      setNearbyLoading(false);
    }
  }

  function handleNearbyPlace(place: GeoapifyPlace) {
    setNearbyOpen(false);
    setLocationEditor({
      mode: "add",
      location: placeToLocation(
        place,
        `nearby-${place.latitude}-${place.longitude}`,
      ),
    });
  }

  async function handleExactPoint() {
    if (!pickedPoint) return;
    setNearbyLoading(true);
    try {
      const address = await reverseGeocodeGeoapify(pickedPoint);
      const location = address
        ? placeToLocation(address, `local-${Date.now()}`)
        : {
            id: `local-${Date.now()}`,
            name: "New location",
            latitude: pickedPoint.latitude,
            longitude: pickedPoint.longitude,
          };
      setLocationEditor({ mode: "add", location });
      setNearbyOpen(false);
    } catch (error) {
      setNearbyError(
        error instanceof Error
          ? error.message
          : "Không thể lấy địa chỉ điểm đã chọn.",
      );
    } finally {
      setNearbyLoading(false);
    }
  }

  async function handleRoutePoints(nextPoints: MapLocation[]) {
    setRoutePoints(nextPoints);
    if (nextPoints.length !== 2) return;
    setMapMode("view");
    routeAbort.current?.abort();
    routeAbort.current = new AbortController();
    try {
      const preview = await previewGeoapifyRoute(
        nextPoints[0],
        nextPoints[1],
        routeAbort.current.signal,
      );
      setRoutePreview(preview);
      setRouteEditor({
        mode: "add",
        route: {
          id: "new-route",
          name: "",
          fromLocation: nextPoints[0],
          toLocation: nextPoints[1],
          geometry: preview.geometry,
          distanceKm: preview.distanceKm,
          durationMinutes: preview.durationMinutes,
        },
      });
    } catch {
      setRoutePreview({
        geometry: straightLineGeometry(nextPoints[0], nextPoints[1]),
        distanceKm: 0,
        durationMinutes: 0,
      });
      setRouteEditor({
        mode: "add",
        route: {
          id: "new-route",
          name: "",
          fromLocation: nextPoints[0],
          toLocation: nextPoints[1],
        },
      });
    }
  }

  async function addLocation(payload: LocationFormPayload) {
    const location: MapLocation = {
      id: `local-${Date.now()}`,
      name: payload.name.trim(),
      type: payload.type || undefined,
      address: payload.address.trim(),
      city: payload.city.trim(),
      stateProvince: payload.stateProvince.trim(),
      country: payload.country.trim(),
      note: payload.note.trim(),
      latitude: payload.latitude,
      longitude: payload.longitude,
    };
    try {
      const response = (await apiClient.post("/locations", {
        locationName: location.name,
        locationType: location.type || null,
        address: location.address || null,
        city: location.city || null,
        stateProvince: location.stateProvince || null,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
        locationNote: location.note || null,
      })) as unknown as LocationCreateResponse;
      const saved = response.value?.locationId
        ? toMapLocation(response.value)
        : response.locationId
          ? toMapLocation(response as LocationResponse)
          : location;
      setLocations((items) => [saved, ...items]);
      toast.success("Location created successfully.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to create location."));
    }
    setLocationEditor(null);
  }

  async function updateLocation(payload: LocationFormPayload) {
    if (!locationEditor?.location) return;
    const locationId = locationEditor.location.id;
    const nextLocation = {
      ...locationEditor.location,
      name: payload.name,
      type: payload.type,
      address: payload.address,
      city: payload.city,
      stateProvince: payload.stateProvince,
      country: payload.country,
      note: payload.note,
      latitude: payload.latitude,
      longitude: payload.longitude,
      updatedAt: locationEditor.location.updatedAt,
    };
    let lastUpdatedAt = locationEditor.location.updatedAt;
    if (!lastUpdatedAt) {
      try {
        const response = (await apiClient.get(
          `/locations/${locationId}`,
        )) as unknown as { value?: LocationResponse } & LocationResponse;
        const detail = response.value ?? response;
        lastUpdatedAt = detail?.updatedAt ?? detail?.lastUpdatedAt;
      } catch (error) {
        toast.error(
          getApiErrorMessage(error, "Unable to load location version."),
        );
        return;
      }
    }
    if (!lastUpdatedAt) {
      toast.error(
        "Location has no concurrency timestamp. Reload the list and try again.",
      );
      return;
    }
    try {
      const response = (await apiClient.put(`/locations/${locationId}`, {
        locationName: payload.name,
        locationType: payload.type,
        address: payload.address,
        city: payload.city,
        stateProvince: payload.stateProvince,
        country: payload.country,
        latitude: payload.latitude,
        longitude: payload.longitude,
        locationNote: payload.note,
        lastUpdatedAt,
      })) as unknown as LocationMutationResponse;
      nextLocation.updatedAt = response.value?.updatedAt ?? lastUpdatedAt;
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to update location."));
      return;
    }
    setLocations((items) =>
      items.map((item) => (item.id === locationId ? nextLocation : item)),
    );
    setLocationEditor(null);
  }

  async function deleteLocation(location: MapLocation) {
    try {
      await apiClient.delete(`/locations/${location.id}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to delete location."));
      return;
    }
    setLocations((items) => items.filter((item) => item.id !== location.id));
    setRoutes((items) =>
      items.filter(
        (route) =>
          route.fromLocation?.id !== location.id &&
          route.toLocation?.id !== location.id,
      ),
    );
    try {
      await reloadRoutes(setRoutes);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          "Location deleted, but routes could not be refreshed.",
        ),
      );
    }
  }

  async function saveRoute(values: RouteFormValues) {
    const fromLocation = locations.find(
      (item) => String(item.id) === values.fromLocationId,
    );
    const toLocation = locations.find(
      (item) => String(item.id) === values.toLocationId,
    );
    if (!fromLocation || !toLocation) return;
    const geometry =
      values.transportMode === "ROAD"
        ? (routePreview?.geometry ??
          routeEditor?.route?.geometry ??
          straightLineGeometry(fromLocation, toLocation))
        : straightLineGeometry(fromLocation, toLocation);
    const route: MapRoute = {
      id: routeEditor?.route?.id ?? `local-route-${Date.now()}`,
      name: values.routeName || `${fromLocation.name} to ${toLocation.name}`,
      transportMode: values.transportMode || "ROAD",
      fromLocation,
      toLocation,
      geometry,
      distanceKm:
        routePreview?.distanceKm ?? routeEditor?.route?.distanceKm ?? null,
      durationMinutes:
        routePreview?.durationMinutes ??
        routeEditor?.route?.durationMinutes ??
        null,
    };
    const routePayload = {
      fromLocationId: fromLocation.id,
      toLocationId: toLocation.id,
      routeName: route.name,
      transportMode: route.transportMode,
      routeNote: values.note,
    };
    let savedRoute: MapRoute | null = null;
    const lastUpdatedAt = routeEditor?.route?.updatedAt;
    if (routeEditor?.mode === "edit" && !lastUpdatedAt) {
      toast.error(
        "Route has no concurrency timestamp. Reload the list and try again.",
      );
      return;
    }
    try {
      if (routeEditor?.mode === "edit") {
        const response = (await apiClient.put(`/routes/${route.id}`, {
          ...routePayload,
          lastUpdatedAt,
        })) as unknown as RouteMutationResponse;
        route.updatedAt = response.value?.updatedAt ?? lastUpdatedAt;
      } else {
        const response = (await apiClient.post(
          "/routes",
          routePayload,
        )) as unknown as RouteMutationResponse;
        savedRoute = response.value ? toMapRoute(response.value) : null;
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to save route."));
      return;
    }
    const localRoute = savedRoute ?? route;
    try {
      await reloadRoutes(setRoutes);
    } catch (error) {
      setRoutes((items) =>
        routeEditor?.route
          ? items.map((item) =>
              item.id === routeEditor.route?.id ? localRoute : item,
            )
          : [localRoute, ...items],
      );
      toast.error(
        getApiErrorMessage(
          error,
          "Route saved, but the route list could not be refreshed.",
        ),
      );
    }
    setRouteEditor(null);
    setRoutePoints([]);
    setRoutePreview(null);
    setMapMode("view");
    toast.success(
      routeEditor?.mode === "edit"
        ? "Route updated successfully."
        : "Route created successfully.",
    );
  }

  async function deleteRoute(route: MapRoute) {
    try {
      await apiClient.delete(`/routes/${route.id}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to delete route."));
      return;
    }
    try {
      await reloadRoutes(setRoutes);
    } catch (error) {
      setRoutes((items) => items.filter((item) => item.id !== route.id));
      toast.error(
        getApiErrorMessage(
          error,
          "Route deleted, but the route list could not be refreshed.",
        ),
      );
    }
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f4f2ed] p-4 lg:p-6">
      <div className="mx-auto grid max-w-[1500px] gap-4">
        <section className="grid gap-4">
          <div className="relative min-h-[calc(100vh-7rem)] overflow-hidden rounded border bg-white shadow-sm">
            <MapViewer
              locations={locations}
              routes={routes}
              preview={routePreview}
              showSearch
              searchOptions={searchOptions}
              searchLoading={searchLoading}
              searchEmptyMessage={
                mapMode === "addLocation"
                  ? "Can not find any location in EU."
                  : "Can not find any location."
              }
              onSearchChange={handleSearchChange}
              onLocationSelect={(location) => {
                if (mapMode !== "addLocation") return;
                searchAbort.current?.abort();
                setSearchLoading(false);
                setMapMode("view");
                setLocationEditor({ mode: "add", location });
              }}
              mode={mapMode}
              onModeChange={(mode) => {
                setMapMode(mode === "buildPlan" || mode === "pickPoint" ? "view" : mode);
                searchAbort.current?.abort();
                setSearchLoading(false);
                setSearchOptions(mode === "addLocation" ? [] : locations);
                if (mode !== "addRoute") setRoutePoints([]);
              }}
              canEditLocation
              canDeleteLocation
              onMarkerAction={(action, location) =>
                action === "EDIT"
                  ? setLocationEditor({ mode: "edit", location })
                  : deleteLocation(location)
              }
              onMapClick={handleMapClick}
              onRoutePointSelect={(_point, location) => {
                if (!location || mapMode !== "addRoute") return;
                const nextPoints = [...routePoints, location]
                  .filter(
                    (item, index, items) =>
                      items.findIndex(
                        (candidate) => candidate.id === item.id,
                      ) === index,
                  )
                  .slice(-2);
                if (nextPoints.length === 1)
                  toast.info("Source selected. Please choose a Destination.");
                void handleRoutePoints(nextPoints);
              }}
              onRouteSelect={(route) => setSelectedRouteId(route.id)}
            />
            <div className="absolute bottom-4 left-4 z-10 flex gap-2">
              <Button
                variant="outline"
                className="bg-white shadow"
                onClick={() => {
                  setRouteEditor(null);
                  setRoutePoints([]);
                  setMapMode(mapMode === "addRoute" ? "view" : "addRoute");
                }}
              >
                <RouteIcon className="mr-2 size-4" />
                {mapMode === "addRoute" ? "Cancel route" : "Add route"}
              </Button>
              <Button
                className="shadow"
                onClick={() => {
                  setLocationEditor(null);
                  setMapMode(
                    mapMode === "addLocation" ? "view" : "addLocation",
                  );
                }}
              >
                <Plus className="mr-2 size-4" />
                {mapMode === "addLocation" ? "Cancel location" : "Add location"}
              </Button>
            </div>
          </div>
          <aside className="grid gap-3 lg:grid-cols-2">
            <div className="border bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold">
                  Locations ({locations.length})
                </h2>
                <MapPin className="size-4 text-[#f39200]" />
              </div>
              <div className="max-h-52 space-y-1 overflow-auto text-sm">
                {locations.slice(0, 20).map((location) => (
                  <button
                    key={location.id}
                    className="block w-full truncate rounded px-2 py-1 text-left hover:bg-orange-50"
                    onClick={() =>
                      setLocationEditor({ mode: "edit", location })
                    }
                  >
                    {location.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="border bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold">Routes ({routes.length})</h2>
                <RouteIcon className="size-4 text-[#f39200]" />
              </div>
              <div className="space-y-2">
                {routes.map((route) => (
                  <div
                    key={route.id}
                    className={`flex items-center gap-1 rounded border p-2 text-xs ${selectedRouteId === route.id ? "border-[#f39200] bg-orange-50" : ""}`}
                  >
                    <button
                      className="min-w-0 flex-1 truncate text-left"
                      onClick={() => setSelectedRouteId(route.id)}
                    >
                      {route.name}
                    </button>
                    <button
                      aria-label="Edit route"
                      onClick={() => setRouteEditor({ mode: "edit", route })}
                    >
                      Edit
                    </button>
                    <button
                      aria-label="Delete route"
                      onClick={() => void deleteRoute(route)}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
        <Dialog
          open={Boolean(locationEditor)}
          onOpenChange={(open) => !open && setLocationEditor(null)}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {locationEditor?.mode === "add"
                  ? "Add location"
                  : "Edit location"}
              </DialogTitle>
            </DialogHeader>
            {locationEditor?.mode === "add" ? (
              <AddLocationForm
                key={`${locationEditor.location?.latitude}:${locationEditor.location?.longitude}`}
                initialValues={
                  locationEditor.location
                    ? locationFormValues(locationEditor.location)
                    : undefined
                }
                onSubmit={addLocation}
                onCancel={() => setLocationEditor(null)}
              />
            ) : locationEditor?.location ? (
              <EditLocationForm
                initialValues={locationFormValues(locationEditor.location)}
                onSubmit={updateLocation}
                onCancel={() => setLocationEditor(null)}
              />
            ) : null}
          </DialogContent>
        </Dialog>
        <Dialog open={nearbyOpen} onOpenChange={setNearbyOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Choose location source</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-500">
              Nearby search uses a 10 km radius.
            </p>
            {nearbyLoading && (
              <p className="py-4 text-sm text-slate-500">
                Searching nearby places…
              </p>
            )}
            {nearbyError && (
              <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {nearbyError}
              </p>
            )}
            {!nearbyLoading && !nearbyError && nearbyPlaces.length === 0 && (
              <p className="py-4 text-sm text-slate-500">
                No matching POI found.
              </p>
            )}
            <div className="max-h-72 space-y-2 overflow-auto">
              {nearbyPlaces.map((place, index) => (
                <button
                  key={`${place.latitude}-${place.longitude}-${index}`}
                  className="block w-full rounded border px-3 py-2 text-left text-sm hover:bg-orange-50"
                  onClick={() => handleNearbyPlace(place)}
                >
                  <span className="font-medium">
                    {place.name || "Unnamed place"}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {place.address ||
                      place.city ||
                      place.country ||
                      "No address"}
                    {place.distanceMeters !== undefined &&
                      place.distanceMeters !== null &&
                      ` · ${Math.round(place.distanceMeters)} m`}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {place.latitude.toFixed(6)}, {place.longitude.toFixed(6)}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t pt-3">
              <Button variant="outline" onClick={() => setNearbyOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => void handleExactPoint()}
                disabled={!pickedPoint || nearbyLoading}
              >
                Use exact clicked point
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog
          open={Boolean(routeEditor)}
          onOpenChange={(open) => {
            if (!open) {
              setRouteEditor(null);
              setRoutePoints([]);
              setMapMode("view");
            }
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {routeEditor?.mode === "add" ? "Add route" : "Edit route"}
              </DialogTitle>
            </DialogHeader>
            {routeEditor && (
              <RouteForm
                locations={locations}
                initialValues={
                  routeEditor.route
                    ? routeFormValues(routeEditor.route)
                    : { transportMode: "ROAD" }
                }
                onSubmit={saveRoute}
                onCancel={() => {
                  setRouteEditor(null);
                  setRoutePoints([]);
                  setMapMode("view");
                }}
              />
            )}
          </DialogContent>
        </Dialog>
        {selectedRoute && (
          <p className="text-xs text-slate-500">
            Selected route: {selectedRoute.name}
          </p>
        )}
      </div>
    </main>
  );
}
