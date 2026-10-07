import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import apiClient from "@/lib/axios";
import { normalizeRole } from "@/features/auth/access-control";
import { useAuthStore } from "@/features/auth/store";
import {
  AddLocationForm,
  MapViewer,
  RouteForm,
  type MapLocation,
} from "@/shared/components/map";
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
  const [addMode, setAddMode] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [routeFormOpen, setRouteFormOpen] = useState(false);
  const [pickedPoint, setPickedPoint] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

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
    if (!isCoordinator || !addMode) return;
    setPickedPoint(point);
    setAddMode(false);
    setFormOpen(true);
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
                <Button onClick={() => setAddMode((value) => !value)}>
                  {addMode ? "Cancel map selection" : "Add Location"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setRouteFormOpen(true)}
                >
                  Create Route
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <MapViewer
          locations={locations}
          loading={loading}
          error={error}
          showSearch
          searchOptions={searchOptions}
          onSearchChange={setSearch}
          canEditLocation={isCoordinator}
          canDeleteLocation={isCoordinator}
          onMapClick={handleMapClick}
          onMarkerAction={handleLocationAction}
        />

        {addMode && (
          <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">
            Click any point on the map to prepare Add Location.
          </p>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Location</DialogTitle>
          </DialogHeader>
          <AddLocationForm
            initialValues={pickedPoint ?? undefined}
            onCancel={() => setFormOpen(false)}
            onSubmit={handleAddLocation}
          />
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
