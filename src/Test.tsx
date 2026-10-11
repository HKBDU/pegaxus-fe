import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import apiClient from "@/lib/axios";
import {
  reverseGeocodeGeoapify,
  searchNearbyGeoapifyPlaces,
  type GeoapifyPlace,
} from "@/shared/utils/map";
import { normalizeRole } from "@/features/auth/access-control";
import { useAuthStore } from "@/features/auth/store";
import {
  AddLocationForm,
  MapViewer,
  RouteForm,
  type MapLocation,
  type MapMode,
  type MapRoutePreview,
  type LocationFormValues,
} from "@/shared/components/map";
import { previewGeoapifyRoute } from "@/shared/utils/map/routing";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

type LocationResponse = {
  locationId: string | number;
  locationName: string;
  locationType?: string | null;
  address?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  country?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  locationNote?: string | null;
  isDeleted?: boolean;
};

type ListResponse = {
  value?: {
    items?: LocationResponse[];
  };
  items?: LocationResponse[];
};

function toMapLocation(location: LocationResponse): MapLocation {
  return {
    id: location.locationId,
    name: location.locationName,
    type: location.locationType,
    address: location.address,
    city: location.city,
    stateProvince: location.stateProvince,
    country: location.country,
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
    note: location.locationNote,
  };
}

async function getMockLocations(): Promise<MapLocation[]> {
  const response = await fetch("/locations-camelcase.json");
  if (!response.ok) {
    throw new Error(`Unable to load location mock: ${response.status}`);
  }

  const items = (await response.json()) as LocationResponse[];
  return items.filter((location) => !location.isDeleted).map(toMapLocation);
}

function shouldFallbackToMock(error: unknown) {
  if (!isAxiosError(error)) return true;

  const status = error.response?.status;
  return !status || status === 404 || status >= 500;
}

async function getLocations(): Promise<{
  data: MapLocation[];
  source: "BE" | "MOCK";
}> {
  try {
    const response = (await apiClient.get("/locations", {
      params: { pageIndex: 1, pageSize: 100 },
    })) as unknown as ListResponse;
    const items = response.value?.items ?? response.items ?? [];
    const data = items
      .filter((location) => !location.isDeleted)
      .map(toMapLocation);

    if (data.length) return { data, source: "BE" };
  } catch (error) {
    if (!shouldFallbackToMock(error)) throw error;
  }

  return { data: await getMockLocations(), source: "MOCK" };
}

export default function Test() {
  const principal = useAuthStore((state) => state.principal);
  const role = normalizeRole(principal?.roles[0] ?? "ANONYMOUS");
  const isCoordinator =
    role === "FLEET_ROUTE_COORDINATOR" || role === "COORDINATOR";
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [dataSource, setDataSource] = useState<"BE" | "MOCK">("BE");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<MapMode>("view");
  const [formOpen, setFormOpen] = useState(false);
  const [routeFormOpen, setRouteFormOpen] = useState(false);
  const [pickedPoint, setPickedPoint] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<GeoapifyPlace[]>([]);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [routeStart, setRouteStart] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [routePreview, setRoutePreview] = useState<MapRoutePreview | null>(
    null,
  );
  const routeAbortController = useRef<AbortController | null>(null);
  const [locationFormValues, setLocationFormValues] = useState<
    Partial<LocationFormValues> | undefined
  >();
  const nearbyAbortController = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;

    async function loadLocations() {
      setLoading(true);
      setError(null);

      try {
        const result = await getLocations();
        if (active) {
          setLocations(result.data);
          setDataSource(result.source);
          if (result.source === "MOCK") {
            toast.info(
              "BE has no Locations. Showing public/locations-camelcase.json.",
            );
          }
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load locations.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadLocations();
    return () => {
      active = false;
    };
  }, [principal?.id]);

  const searchOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return locations;

    return locations.filter((location) =>
      [location.name, location.city, location.country]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [locations, search]);

  function handleMapClick(point: { latitude: number; longitude: number }) {
    if (!isCoordinator || mode !== "addLocation") return;

    nearbyAbortController.current?.abort();
    nearbyAbortController.current = new AbortController();
    setPickedPoint(point);
    setMode("view");
    setNearbyPlaces([]);
    setNearbyError(null);
    setNearbyOpen(true);
    setNearbyLoading(true);

    void searchNearbyGeoapifyPlaces(point, nearbyAbortController.current.signal)
      .then((places) => setNearbyPlaces(places))
      .catch((loadError) => {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        )
          return;
        setNearbyError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to search nearby places.",
        );
      })
      .finally(() => setNearbyLoading(false));
  }

  function handleRoutePointSelect(point: {
    latitude: number;
    longitude: number;
  }) {
    if (!routeStart || routePreview) {
      routeAbortController.current?.abort();
      setRouteStart(point);
      setRoutePreview(null);
      toast.info("Source selected. Please choose a Destination.");
      return;
    }
    if (
      routeStart.latitude === point.latitude &&
      routeStart.longitude === point.longitude
    )
      return;
    routeAbortController.current?.abort();
    const controller = new AbortController();
    routeAbortController.current = controller;
    void previewGeoapifyRoute(routeStart, point, controller.signal)
      .then((result) => setRoutePreview(result))
      .catch((loadError) => {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        )
          return;
        setRoutePreview({
          geometry: null,
          distanceKm: 0,
          durationMinutes: 0,
          error:
            loadError instanceof Error
              ? loadError.message
              : "Unable to preview route.",
        });
      });
  }

  function openLocationForm(values: Partial<LocationFormValues>) {
    setLocationFormValues(values);
    setNearbyOpen(false);
    setFormOpen(true);
  }

  function handleUseNearbyPlace(place: GeoapifyPlace) {
    if (!pickedPoint) return;

    openLocationForm({
      name: place.name || place.address || "Nearby place",
      address: place.address || "",
      city: place.city || "",
      stateProvince: place.stateProvince || "",
      country: place.countryCode || place.country || "",
      latitude: place.latitude,
      longitude: place.longitude,
      note: "",
    });
  }

  async function handleUseExactPoint() {
    if (!pickedPoint) return;

    try {
      const place = await reverseGeocodeGeoapify(pickedPoint);
      openLocationForm({
        name: place?.name || place?.address || "",
        address: place?.address || "",
        city: place?.city || "",
        stateProvince: place?.stateProvince || "",
        country: place?.countryCode || place?.country || "",
        latitude: pickedPoint.latitude,
        longitude: pickedPoint.longitude,
        note: "",
      });
    } catch (loadError) {
      toast.error(
        loadError instanceof Error
          ? loadError.message
          : "Unable to reverse geocode this point.",
      );
      openLocationForm({
        latitude: pickedPoint.latitude,
        longitude: pickedPoint.longitude,
      });
    }
  }

  function handleLocationAction(
    action: "EDIT" | "DELETE",
    location: MapLocation,
  ) {
    toast.info(
      `${action} payload ready for ${location.name}. Mutation endpoint is not in flow3.md.`,
    );
  }

  function handleAddLocation(payload: unknown) {
    toast.info(
      "Add Location payload prepared. No mutation sent because flow3.md has no endpoint.",
      {
        description: JSON.stringify(payload),
      },
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto grid max-w-7xl gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Map whitebox test</CardTitle>
            <p className="text-sm text-muted-foreground">
              Login through BE, then reload this page with each role.
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <span className="rounded bg-slate-100 px-3 py-2 text-sm">
              Current role: <strong>{role}</strong>
            </span>
            <span className="rounded bg-slate-100 px-3 py-2 text-sm">
              Location source: <strong>{dataSource}</strong>
            </span>
            {isCoordinator && (
              <>
                <Button
                  onClick={() =>
                    setMode(mode === "addLocation" ? "view" : "addLocation")
                  }
                >
                  {mode === "addLocation"
                    ? "Cancel map selection"
                    : "Add Location"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMode(mode === "addRoute" ? "view" : "addRoute");
                    setRouteStart(null);
                    setRoutePreview(null);
                  }}
                >
                  {mode === "addRoute"
                    ? "Cancel route preview"
                    : "Preview Route"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <MapViewer
          locations={locations}
          loading={loading}
          error={error}
          mode={mode}
          onModeChange={setMode}
          preview={routePreview}
          onRoutePointSelect={handleRoutePointSelect}
          showSearch
          searchOptions={searchOptions}
          onSearchChange={setSearch}
          canEditLocation={isCoordinator}
          canDeleteLocation={isCoordinator}
          onMapClick={handleMapClick}
          onMarkerAction={handleLocationAction}
        />

        {mode === "addLocation" && (
          <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">
            Click any point on the map to prepare Add Location.
          </p>
        )}
        {mode === "addRoute" && routePreview && (
          <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">
            {routePreview.error ??
              `Estimated: ${routePreview.distanceKm.toFixed(1)} km · ${Math.round(routePreview.durationMinutes)} min`}
          </p>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Location</DialogTitle>
          </DialogHeader>
          <AddLocationForm
            key={`${locationFormValues?.latitude ?? "new"}-${locationFormValues?.longitude ?? "new"}`}
            initialValues={locationFormValues}
            onCancel={() => setFormOpen(false)}
            onSubmit={handleAddLocation}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={nearbyOpen} onOpenChange={setNearbyOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose location point</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Nearby places within 10km of the clicked point.
          </p>
          {nearbyLoading && (
            <p className="text-sm">Searching nearby places...</p>
          )}
          {nearbyError && (
            <p className="text-sm text-destructive">{nearbyError}</p>
          )}
          {!nearbyLoading && !nearbyPlaces.length && !nearbyError && (
            <p className="text-sm text-muted-foreground">
              No supported nearby place found.
            </p>
          )}
          <div className="grid gap-2">
            {nearbyPlaces.map((place, index) => (
              <button
                key={`${place.latitude}-${place.longitude}-${index}`}
                type="button"
                className="rounded border p-3 text-left hover:border-amber-500 hover:bg-amber-50"
                onClick={() => handleUseNearbyPlace(place)}
              >
                <span className="block font-semibold">
                  {place.name || place.address || "Unnamed place"}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {place.address || "No address returned"}
                </span>
                <span className="mt-1 block font-mono text-xs text-muted-foreground">
                  {place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}
                  {place.distanceMeters != null &&
                    ` · ${Math.round(place.distanceMeters)}m`}
                </span>
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" onClick={() => setNearbyOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleUseExactPoint()}>
              Use exact clicked point
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={routeFormOpen} onOpenChange={setRouteFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Route</DialogTitle>
          </DialogHeader>
          <RouteForm
            locations={locations}
            onCancel={() => setRouteFormOpen(false)}
            onSubmit={(values) => {
              toast.info(
                "Route payload prepared. No mutation sent because flow3.md has no endpoint.",
                {
                  description: JSON.stringify(values),
                },
              );
            }}
          />
        </DialogContent>
      </Dialog>
    </main>
  );
}
