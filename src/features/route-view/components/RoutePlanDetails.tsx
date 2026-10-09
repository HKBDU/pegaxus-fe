import type { ComponentType } from "react"
import { Tabs } from "radix-ui"
import { useSearchParams } from "react-router-dom"
import { routeViewTabSchema } from "../schemas"
import type { RouteDetailPath, RouteMapViewerProps, RoutePlanDetail } from "../types"
import { RoutePlanHeader } from "./RoutePlanHeader"
import { RoutePlanOverview } from "./RoutePlanOverview"
import { RoutePlanMapPanel } from "./RoutePlanMapPanel"
import { RouteSegmentList } from "./RouteSegmentList"
import { RouteContingencyTab } from "./RouteContingencyTab"
import { RouteLegalReview } from "./RouteLegalReview"

export function RoutePlanDetails({ plan, mapViewer, routeDetailPath }: { plan: RoutePlanDetail; mapViewer?: ComponentType<RouteMapViewerProps>; routeDetailPath?: RouteDetailPath }) {
  const [params, setParams] = useSearchParams()
  const selected = routeViewTabSchema.safeParse(params.get("tab") ?? "map")
  const active = selected.success ? selected.data : "map"
  return <div className="space-y-5">
    <RoutePlanHeader plan={plan} />
    <RoutePlanOverview plan={plan} />
    <Tabs.Root value={active} onValueChange={(value) => setParams((current) => {
      const next = new URLSearchParams(current); next.set("tab", routeViewTabSchema.parse(value)); return next
    })}>
      <Tabs.List aria-label="Route plan sections" className="mb-5 flex flex-nowrap gap-5 overflow-x-auto border-b border-slate-200">
        {[{ value: "map", label: "Map View" }, { value: "segments", label: "Segment List" }, { value: "contingency", label: "Contingency" }].map((tab) =>
          <Tabs.Trigger key={tab.value} value={tab.value} className="shrink-0 whitespace-nowrap border-b-2 border-transparent px-1 py-2.5 font-heading text-sm uppercase text-slate-500 outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30 data-[state=active]:border-primary data-[state=active]:text-primary">{tab.label}</Tabs.Trigger>)}
      </Tabs.List>
      <Tabs.Content value="map" className="outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30"><RoutePlanMapPanel plan={plan} mapViewer={mapViewer} /></Tabs.Content>
      <Tabs.Content value="segments" className="outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30"><RouteSegmentList segments={plan.segments} /></Tabs.Content>
      <Tabs.Content value="contingency" className="outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30"><RouteContingencyTab plan={plan} routeDetailPath={routeDetailPath} /></Tabs.Content>
    </Tabs.Root>
    <RouteLegalReview review={plan.legalReview} />
  </div>
}
