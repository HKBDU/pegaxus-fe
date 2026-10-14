import type { ComponentType, ReactNode } from "react"
import { Tabs } from "radix-ui"
import { useSearchParams } from "react-router-dom"
import { routePlanEdit, contingencyRouteCreate, returnRouteCreate } from "@/app/route-config"
import { canAccess } from "@/features/auth/access-control"
import { useAuthStore } from "@/features/auth/store"
import { Button } from "@/shared/components/ui/button"
import { CancelRoutePlanDialog, LegalFeasibilityPanel } from "@/features/route-plan"
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
  const principal = useAuthStore((state) => state.principal)
  const isCoordinator = canAccess(principal, { anyRole: ["FLEET_ROUTE_COORDINATOR"] })
  const isSpecialist = canAccess(principal, { anyRole: ["TRANSPORT_SPECIALIST"] })
  const [params, setParams] = useSearchParams()
  const selected = routeViewTabSchema.safeParse(params.get("tab") ?? "map")
  const active = selected.success ? selected.data : "map"
  return <div className="space-y-5">
    <RoutePlanHeader plan={plan} actions={<>{isCoordinator && plan.status === "DRAFT" ? <><Button asChild size="sm" variant="outline"><a href={routePlanEdit(plan.routePlanId)}>Edit</a></Button><CancelRoutePlanDialog routePlanId={plan.routePlanId} status={plan.status} lastUpdatedAt={plan.updatedAt} routePlanCode={plan.routePlanCode}><Button size="sm" variant="destructive">Cancel</Button></CancelRoutePlanDialog></> : null}{isCoordinator && plan.routeType === "PRIMARY" ? <><Button asChild size="sm" variant="outline"><a href={contingencyRouteCreate(plan.transportPlanId)}>Create backup</a></Button><Button asChild size="sm" variant="outline"><a href={returnRouteCreate(plan.transportPlanId)}>Create return</a></Button></> : null}{isSpecialist && plan.status === "DRAFT" ? <LegalFeasibilityPanel routePlanId={plan.routePlanId} lastUpdatedAt={plan.updatedAt} segments={plan.segments.map((segment) => ({ sequenceNo: segment.sequenceNo, route: { ...segment.route, routeName: segment.route.routeName ?? segment.route.routeCode, distanceKm: segment.route.distanceKm ?? 0, estimatedDurationMinutes: segment.route.estimatedDurationMinutes ?? 0 } }))} legalReview={plan.legalReview ? { ...plan.legalReview, note: plan.legalReview.note ?? null, blockedSegments: plan.legalReview.blockedSegments ?? [], reviewedBy: plan.legalReview.reviewedBy ? { ...plan.legalReview.reviewedBy, employeeCode: plan.legalReview.reviewedBy.employeeCode ?? "" } : null, reviewedAt: plan.legalReview.reviewedAt ?? null } : null} trigger={<Button size="sm">Legal review</Button>} /> : null}</>} />
    {emergencyArea}
    <RoutePlanOverview plan={plan} />
    <Tabs.Root value={active} onValueChange={(value) => setParams((current) => {
      const next = new URLSearchParams(current); next.set("tab", routeViewTabSchema.parse(value)); return next
    })}>
      <Tabs.List aria-label="Route plan sections" className="mb-5 flex flex-nowrap gap-2 overflow-x-auto border-b border-slate-200">
        {[{ value: "map", label: "Map View", icon: MapPin }, { value: "segments", label: "Segment List", icon: ListOrdered }, { value: "contingency", label: "Contingency", icon: GitBranch }].map(({ value, label, icon: Icon }) =>
          <Tabs.Trigger key={value} value={value} className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-t-lg border-b-2 border-transparent px-4 py-3.5 font-heading text-sm uppercase text-slate-500 outline-none hover:bg-white hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-primary/30 data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><Icon aria-hidden="true" className="size-4" />{label}</Tabs.Trigger>)}
      </Tabs.List>
      <Tabs.Content value="map" className="outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30"><RoutePlanMapPanel plan={plan} mapViewer={mapViewer} /></Tabs.Content>
      <Tabs.Content value="segments" className="outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30"><RouteSegmentList segments={plan.segments} routePlanId={plan.routePlanId} canManageOutsource={isCoordinator} /></Tabs.Content>
      <Tabs.Content value="contingency" className="outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30"><RouteContingencyTab plan={plan} routeDetailPath={routeDetailPath} /></Tabs.Content>
    </Tabs.Root>
    <RouteLegalReview review={plan.legalReview} />
  </div>
}
