import type { ComponentType, ReactNode } from "react"
import { Tabs } from "radix-ui"
import { useSearchParams } from "react-router-dom"
import { GitBranch, ListOrdered, MapPin } from "lucide-react"
import { routeViewTabSchema } from "../schemas"
import type { RouteDetailPath, RouteMapViewerProps, RoutePlanDetail } from "../types"
import { RoutePlanHeader } from "./RoutePlanHeader"
import { RoutePlanOverview } from "./RoutePlanOverview"
import { RoutePlanMapPanel } from "./RoutePlanMapPanel"
import { RouteSegmentList } from "./RouteSegmentList"
import { RouteContingencyTab } from "./RouteContingencyTab"
import { RouteLegalReview } from "./RouteLegalReview"

export function RoutePlanDetails({ plan, mapViewer, routeDetailPath, emergencyArea }: { plan: RoutePlanDetail; mapViewer?: ComponentType<RouteMapViewerProps>; routeDetailPath?: RouteDetailPath; emergencyArea?: ReactNode }) {
  const [params, setParams] = useSearchParams()
  const selected = routeViewTabSchema.safeParse(params.get("tab") ?? "map")
  const active = selected.success ? selected.data : "map"
  return <div className="space-y-4">
    <RoutePlanHeader plan={plan} />
    {emergencyArea}
    <RoutePlanOverview plan={plan} />
    <Tabs.Root value={active} onValueChange={(value) => setParams((current) => {
      const next = new URLSearchParams(current); next.set("tab", routeViewTabSchema.parse(value)); return next
    })}>
      <Tabs.List aria-label="Route plan sections" className="mb-4 flex flex-nowrap gap-2 overflow-x-auto border-b border-slate-200">
        {[{ value: "map", label: "Map View", icon: MapPin }, { value: "segments", label: "Segment List", icon: ListOrdered }, { value: "contingency", label: "Contingency", icon: GitBranch }].map(({ value, label, icon: Icon }) =>
          <Tabs.Trigger key={value} value={value} className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-t-[2px] border-b-2 border-transparent px-3 py-2.5 font-heading text-sm uppercase text-slate-500 outline-none transition-colors duration-200 motion-reduce:transition-none hover:bg-white hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-primary/30 data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><Icon aria-hidden="true" className="size-4" />{label}</Tabs.Trigger>)}
      </Tabs.List>
      <Tabs.Content value="map" className="outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30"><RoutePlanMapPanel plan={plan} mapViewer={mapViewer} /></Tabs.Content>
      <Tabs.Content value="segments" className="outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30"><RouteSegmentList segments={plan.segments} /></Tabs.Content>
      <Tabs.Content value="contingency" className="outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30"><RouteContingencyTab plan={plan} routeDetailPath={routeDetailPath} /></Tabs.Content>
    </Tabs.Root>
    <RouteLegalReview review={plan.legalReview} />
  </div>
}
