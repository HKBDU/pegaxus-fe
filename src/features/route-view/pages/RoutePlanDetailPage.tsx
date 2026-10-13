import { useEffect, useRef, type ComponentType } from "react"
import { useParams, useSearchParams } from "react-router-dom"
import { useMutationState } from "@tanstack/react-query"
import { ROLE_ROUTES } from "@/app/route-config"
import { PageHeader } from "@/shared/components/PageHeader"
import { ErrorState } from "@/shared/components/common"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useAuthStore } from "@/features/auth/store"
import { Flow3MockIndicator } from "@/features/transport-plan/components/Flow3MockIndicator"
import { useRoutePlanDetail } from "../hooks/useRoutePlanDetail"
import { canViewRoute, getRouteViewError, getEmergencyError } from "../services"
import { actionEntityIdSchema } from "@/features/transport-plan/schemas"
import { RoutePlanDetails } from "../components/RoutePlanDetails"
import type { RouteDetailPath, RouteMapViewerProps } from "../types"
import type { EmergencyAction } from "../types"
import { Button } from "@/shared/components/ui/button"
import { getWorkspaceRole } from "@/features/transport-plan/workspace-role"
import { useEmergencyContext } from "../hooks/useEmergencyRoute"
import { getEmergencyActions } from "../emergency-policy"
import { EmergencyActionBar } from "../components/emergency/EmergencyActionBar"
import { BackupActivationRequestDialog } from "../components/emergency/BackupActivationRequestDialog"
import { DriverNoticeDialog } from "../components/emergency/DriverNoticeDialog"
import { RouteChangeDecisionPanel } from "../components/emergency/RouteChangeDecisionPanel"
import { ReturnActivationPanel } from "../components/emergency/ReturnActivationPanel"

export default function RoutePlanDetailPage({ mapViewer, routeDetailPath, emergencyView }: { mapViewer?: ComponentType<RouteMapViewerProps>; routeDetailPath?: RouteDetailPath; emergencyView?: "decision" | "activation" } = {}) {
  const { routePlanId = "" } = useParams<{ routePlanId: string }>()
  const [params, setParams] = useSearchParams()
  const principal = useAuthStore((state) => state.principal)
  const allowed = canViewRoute(principal) && (!emergencyView || getWorkspaceRole(principal) === "manager")
  const valid = actionEntityIdSchema.safeParse(routePlanId).success
  const query = useRoutePlanDetail(routePlanId, allowed)
  const error = query.isError ? getRouteViewError(query.error) : null
  const context = useEmergencyContext(query.data, allowed && !error)
  const mutationErrors = useMutationState({ filters: { mutationKey: ["route-view", "emergency", routePlanId], status: "error" }, select: mutation => mutation.state.error })
  const accessFailure = [context.error, ...mutationErrors].find(problem => problem && (getEmergencyError(problem).denied || getEmergencyError(problem).unauthorized))
  const mode = params.get("emergency") ?? emergencyView
  const actions = query.data && context.data ? getEmergencyActions(query.data, context.data.workspace) : []
  const activeMode = actions.find(action => action === mode)
  const changeMode = (action?: EmergencyAction) => setParams(current => {
    const next = new URLSearchParams(current)
    if (action) next.set("emergency", action); else next.set("emergency", "overview")
    return next
  })
  const plan = query.data
  const hasPlan = Boolean(plan)
  const pageRef = useRef<HTMLDivElement>(null)
  const fullPageMode = mode === "decision" || mode === "activation"
  const staff = ["coordinator", "specialist"].includes(getWorkspaceRole(principal) ?? "")
  // RP3 alone is not enough to authorize the assigned staff workspace; wait for TP3/AB2.
  const waitingForAction = (staff || Boolean(mode && mode !== "overview")) && context.loading
  useEffect(() => {
    if (!hasPlan || waitingForAction || mode === "request" || mode === "notice") return
    const heading = pageRef.current?.querySelector<HTMLElement>("h1")
    heading?.focus({ preventScroll: true })
    pageRef.current?.scrollIntoView({ block: "start" })
  }, [routePlanId, mode, hasPlan, waitingForAction])
  let workspace
  if (context.data && plan) {
    if (activeMode === "decision") workspace = <RouteChangeDecisionPanel plan={plan} context={context.data} onBack={() => changeMode()} />
    if (activeMode === "activation") workspace = <ReturnActivationPanel plan={plan} context={context.data} onBack={() => changeMode()} />
    if (mode && mode !== "overview" && !activeMode) workspace = <div className="space-y-3"><ErrorState message="This emergency action is unavailable for your role or the current route and transport state." /><Button className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none" variant="outline" onClick={() => changeMode()}>Back to Route Plan</Button></div>
  }
  return <div ref={pageRef} className="booking-page-shell min-w-0 min-h-[calc(100svh-5rem)] scroll-mt-24 px-4 py-5 font-sans sm:px-6 lg:px-8 lg:py-6">
    <div className="mx-auto w-full min-w-0 max-w-[1152px] space-y-4">
      <Flow3MockIndicator />
      {allowed && valid && !error && !accessFailure && plan ? <>
        {waitingForAction ? <Skeleton role="status" aria-label="Loading authorized route workspace" className="h-80 w-full" /> : context.error && (staff || (mode && mode !== "overview")) ?
          <div className="space-y-3"><ErrorState message={getEmergencyError(context.error).message} /><Button className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none" variant="outline" onClick={() => changeMode()}>Back to Route Plan</Button></div> : workspace ?
          <div key={`${routePlanId}-${mode}`}>{workspace}</div> : !fullPageMode ? <>
            {context.error && <ErrorState message={getEmergencyError(context.error).message} />}
            <RoutePlanDetails key={routePlanId} plan={plan} mapViewer={mapViewer} routeDetailPath={routeDetailPath}
              emergencyArea={context.data ? <EmergencyActionBar plan={plan} context={context.data} onAction={changeMode} /> : undefined} />
          </> : null}
        {context.data && activeMode === "request" && <BackupActivationRequestDialog key={routePlanId} plan={plan} context={context.data} onClose={() => changeMode()} />}
        {context.data && activeMode === "notice" && <DriverNoticeDialog key={routePlanId} plan={plan} context={context.data} onClose={() => changeMode()} />}
      </> : <>
        <PageHeader className="[&_h1]:text-2xl [&_h1]:leading-tight sm:[&_h1]:text-3xl" title="Route Plan Details" backHref={ROLE_ROUTES.transportPlans} backLabel="Back to Transport Plans" />
        {!allowed ? <ErrorState message="You do not have permission to view route plans." /> : !valid ? <ErrorState message="The route plan identifier is invalid." /> : accessFailure ? <ErrorState message={getEmergencyError(accessFailure).message} /> : error ?
          <ErrorState message={error.message} onRetry={error.retryable ? () => void query.refetch() : undefined} /> :
          <div role="status" aria-label="Loading route plan" className="space-y-4"><Skeleton className="h-24 w-full" /><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-24 w-full" />)}</div><Skeleton className="h-96 w-full" /></div>}
      </>}
    </div>
  </div>
}
