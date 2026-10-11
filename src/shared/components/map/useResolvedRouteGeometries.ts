import { useEffect, useState } from "react";
import type { MapRoute } from "./types";
import {
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
    return item
      ? {
          ...route,
          geometry: item.line,
          source: item.estimated
            ? ("preview" as const)
            : (route.source ?? ("saved" as const)),
        }
      : route;
  });
}
