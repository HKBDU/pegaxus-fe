import type { ComponentType } from "react"
import { useParams } from "react-router-dom"
import { ROLE_ROUTES } from "@/app/route-config"
import { PageHeader } from "@/shared/components/PageHeader"
import { ErrorState } from "@/shared/components/common"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useAuthStore } from "@/features/auth/store"
import { Flow3MockIndicator } from "@/features/transport-plan/components/Flow3MockIndicator"
import { useRoutePlanDetail } from "../hooks/useRoutePlanDetail"
import { canViewRoute, getRouteViewError } from "../services"
import { routePlanIdSchema } from "../schemas"
import { RoutePlanDetails } from "../components/RoutePlanDetails"
import type { RouteDetailPath, RouteMapViewerProps } from "../types"

export default function RoutePlanDetailPage({ mapViewer, routeDetailPath }: { mapViewer?: ComponentType<RouteMapViewerProps>; routeDetailPath?: RouteDetailPath } = {}) {
  const { routePlanId = "" } = useParams<{ routePlanId: string }>()
  const principal = useAuthStore((state) => state.principal)
  const allowed = canViewRoute(principal)
  const valid = routePlanIdSchema.safeParse(routePlanId).success
  const query = useRoutePlanDetail(routePlanId, allowed)
  const error = query.isError ? getRouteViewError(query.error) : null
  return <div className="booking-page-shell min-w-0 min-h-[calc(100svh-5rem)] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
    <div className="booking-page-enter mx-auto w-full min-w-0 max-w-[1152px] space-y-5">
      <Flow3MockIndicator />
      {allowed && valid && !error && query.data ? <RoutePlanDetails key={routePlanId} plan={query.data} mapViewer={mapViewer} routeDetailPath={routeDetailPath} /> : <>
        <PageHeader title="Route Plan Details" backHref={ROLE_ROUTES.transportPlans} backLabel="Back to Transport Plans" />
        {!allowed ? <ErrorState message="You do not have permission to view route plans." /> : !valid ? <ErrorState message="The route plan identifier is invalid." /> : error ?
          <ErrorState message={error.message} onRetry={error.retryable ? () => void query.refetch() : undefined} /> :
          <div role="status" aria-label="Loading route plan" className="space-y-5"><Skeleton className="h-24 w-full" /><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-24 w-full" />)}</div><Skeleton className="h-96 w-full" /></div>}
      </>}
    </div>
  </div>
}
