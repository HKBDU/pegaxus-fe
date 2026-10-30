import { Component, useMemo, type ComponentType, type ReactNode } from "react";
import { MapPin } from "lucide-react";
import { MapViewer } from "@/shared/components/map";
import { createGeoapifyMapStyleUrl } from "@/shared/utils/map/geoapify";
import { isFlow3MockMode } from "@/features/transport-plan/source";
import { toRouteMapData } from "../adapters/route-plan-map.adapter";
import type { RouteMapViewerProps, RoutePlanDetail } from "../types";

function MapUnavailable({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="flex h-full min-h-64 flex-col items-center justify-center gap-3 rounded-[2px] border border-dashed border-slate-300 bg-slate-50 p-4 text-center"
    >
      <MapPin aria-hidden="true" className="size-8 text-slate-400" />
      <p className="text-sm font-semibold text-slate-700">Map unavailable</p>
      <p className="max-w-sm text-xs leading-5 text-slate-500">
        {children} Segment and legal review information remains available below
        or in the Segment List tab.
      </p>
    </div>
  );
}

class MapBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <MapUnavailable>
        The map could not initialize. Reload to retry.
      </MapUnavailable>
    ) : (
      this.props.children
    );
  }
}

export function RoutePlanMap({
  plan,
  mapViewer: Viewer = MapViewer,
}: {
  plan: RoutePlanDetail;
  mapViewer?: ComponentType<RouteMapViewerProps>;
}) {
  const data = useMemo(() => toRouteMapData(plan), [plan]);
  const style = useMemo(() => {
    try {
      return createGeoapifyMapStyleUrl();
    } catch {
      return null;
    }
  }, []);
  const mock = isFlow3MockMode();
  return (
    <div className="min-w-0 space-y-3" data-route-map-id={plan.routePlanId}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
          {data.locations.length} verified stops · Route line enabled
        </span>
        {mock && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-800">
            MOCK DATA · Demo locations
          </span>
        )}
      </div>
      <div className="h-[360px] min-w-0 overflow-hidden rounded-[2px] border border-slate-200 bg-slate-50 sm:h-[420px] xl:h-[460px] [&>div]:h-full [&>div]:min-h-0">
        {!data.locations.length ? (
          <MapUnavailable>
            No valid location coordinates are supplied for this route.
          </MapUnavailable>
        ) : !style ? (
          <MapUnavailable>
            Map configuration is unavailable. Contact your administrator.
          </MapUnavailable>
        ) : (
          <MapBoundary key={plan.routePlanId}>
            <Viewer
              locations={data.locations}
              route={data.route}
              routes={data.routes}
              styleUrl={style}
              mode="view"
              canEditLocation={false}
              canDeleteLocation={false}
              showSearch={false}
            />
          </MapBoundary>
        )}
      </div>
      <p className="text-xs leading-5 text-slate-500">
        Lines are generated from the supplied segment endpoints. Road routing is
        used when available; otherwise a direct estimated line is shown.
        {data.omittedStops > 0
          ? " Stops without valid coordinates remain in the segment timeline."
          : ""}
      </p>
    </div>
  );
}
