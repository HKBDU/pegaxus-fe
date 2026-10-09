import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { RoutePlanBuilder } from "../components/RoutePlanBuilder";
import { getRoutePlans } from "../services";
import type { MapLocation, MapRoute } from "@/shared/components/map";

function toMapLocation(location: {
  locationId: string;
  locationName: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
}): MapLocation | null {
  if (location.latitude == null || location.longitude == null) return null;
  return {
    id: location.locationId,
    name: location.locationName,
    city: location.city,
    country: location.country,
    latitude: location.latitude,
    longitude: location.longitude,
  };
}

export default function CreateContingencyRoutePage() {
  const { transportPlanId } = useParams<{ transportPlanId: string }>();
  const [primaryRoutes, setPrimaryRoutes] = useState<MapRoute[]>([]);
  const [loading, setLoading] = useState(Boolean(transportPlanId));
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!transportPlanId) {
      setLoading(false);
      setError(
        "Transport Plan id is missing. Please create a PRIMARY route plan first.",
      );
      return;
    }

    let active = true;
    void getRoutePlans(transportPlanId, {
      routeType: "PRIMARY",
      pageIndex: 1,
      pageSize: 20,
    })
      .then((result) => {
        if (!active) return;
        const primary = result.items.find(
          (plan) =>
            plan.routeType === "PRIMARY" &&
            plan.status !== "CANCELLED" &&
            plan.segments.length > 0,
        );
        const routes =
          primary?.segments.flatMap((segment) => {
            const from = toMapLocation(segment.fromLocation);
            const to = toMapLocation(segment.toLocation);
            if (!from || !to) return [];
            return [
              {
                id: segment.route.routeId,
                name: segment.route.routeName,
                transportMode: segment.route.transportMode,
                fromLocation: from,
                toLocation: to,
                distanceKm: segment.route.distanceKm,
                durationMinutes: segment.route.estimatedDurationMinutes,
                readonly: true,
              },
            ];
          }) ?? [];
        setPrimaryRoutes(routes);
        if (!routes.length)
          setError(
            "No valid PRIMARY route plan found. Please create a PRIMARY route plan first.",
          );
      })
      .catch(() => {
        if (active)
          setError(
            "Unable to load PRIMARY route plan. Please create a PRIMARY route plan first.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [transportPlanId]);

  if (loading)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 text-sm">
        Loading PRIMARY route plan…
      </main>
    );

  return (
    <RoutePlanBuilder
      routeType="BACKUP"
      transportPlanId={transportPlanId ?? ""}
      primaryRoutes={primaryRoutes}
      primaryAvailable={primaryRoutes.length > 0}
      primaryError={error}
      locations={primaryRoutes.flatMap((route) => [route.fromLocation, route.toLocation]).filter((value): value is NonNullable<typeof value> => Boolean(value))}
      routes={primaryRoutes}
    />
  );
}
