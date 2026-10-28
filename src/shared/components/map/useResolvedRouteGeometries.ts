import { useEffect, useState } from "react";
import type { MapRoute } from "./types";
import {
  estimateRouteGeometry,
  resolveRouteGeometry,
  type ResolvedRouteGeometry,
} from "./route-geometry-cache";

export function useResolvedRouteGeometries(routes: MapRoute[]) {
  const [resolved, setResolved] = useState<
    Map<string | number, ResolvedRouteGeometry>
  >(new Map());

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void Promise.all(
      routes.map(
        async (route) =>
          [
            route.id,
            await resolveRouteGeometry(route, controller.signal),
          ] as const,
      ),
    ).then((items) => {
      if (active) setResolved(new Map(items));
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [routes]);

  return routes.map((route) => {
    const item = resolved.get(route.id);
    if (item) {
      return {
        ...route,
        geometry: item.line,
        source: item.estimated
          ? ("preview" as const)
          : (route.source ?? ("saved" as const)),
      };
    }

    // Render immediately while IndexedDB/Geoapify is still pending.
    // The resolved road geometry replaces this line when available.
    const estimate = estimateRouteGeometry(route);
    return estimate
      ? { ...route, geometry: estimate, source: "preview" as const }
      : route;
  });
}
