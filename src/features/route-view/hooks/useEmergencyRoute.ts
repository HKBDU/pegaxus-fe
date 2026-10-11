import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/features/auth/store"
import { useApprovedBooking, approvedBookingKeys } from "@/features/transport-plan/hooks/useApprovedBookings"
import { useTransportPlan, transportPlanKeys } from "@/features/transport-plan/hooks/useTransportPlans"
import { getApiErrorInfo } from "@/features/transport-plan/services"
import { executeEmergencyAction } from "../services"
import { getEmergencyActions } from "../emergency-policy"
import { routeViewKeys, useRoutePlanAlternatives } from "./useRoutePlanDetail"
import type { EmergencyAction, EmergencyRequestMap, RoutePlanDetail, RoutePlanSummary } from "../types"
import type { RouteWorkspaceContext } from "../workspace-actions"

export type EmergencyContext = {
  workspace: RouteWorkspaceContext
  transportCode: string
  activeRoutes: RoutePlanSummary[]
  primaryRoute?: RoutePlanSummary
}

export function useEmergencyContext(plan?: RoutePlanDetail, enabled = true) {
  const principal = useAuthStore(state => state.principal)
  const ready = enabled && Boolean(plan)
  const transport = useTransportPlan(plan?.transportPlanId ?? "", ready)
  const booking = useApprovedBooking(plan?.bookingId ?? "", ready)
  const routes = useRoutePlanAlternatives(plan?.transportPlanId ?? "", {}, ready)
  const error = transport.isError ? transport.error : booking.isError ? booking.error : routes.isError ? routes.error : null
  const loading = ready && (transport.isPending || booking.isPending || routes.isPending)
  let data: EmergencyContext | undefined
  const matches = plan && transport.data?.booking.bookingId === plan.bookingId && booking.data?.transportPlan?.transportPlanId === plan.transportPlanId &&
    booking.data.transport?.transportId === transport.data.transport.transportId
  if (ready && !error && !loading && matches && routes.data) {
    data = { workspace: { principal, planStatus: transport.data!.status, transportStatus: transport.data!.transport.status,
      dossierStatus: booking.data!.complianceDossier?.status, hasActivePrimary: routes.data.items.some(route => route.routeType === "PRIMARY" && route.status === "ACTIVE") }, transportCode: transport.data!.transport.transportCode,
      activeRoutes: routes.data.items.filter(route => route.status === "ACTIVE"),
      primaryRoute: routes.data.items.find(route => route.routeType === "PRIMARY" && route.status !== "CANCELLED") }
  }
  const mismatch = ready && !error && !loading && !matches ? new Error("This route does not belong to the current authorized transport workspace.") : null
  return { data, error: error ?? mismatch, loading }
}

export async function refreshEmergencyQueries(client: QueryClient, plan: Pick<RoutePlanDetail, "routePlanId" | "transportPlanId" | "bookingId">, action: EmergencyAction) {
  const keys: readonly (readonly unknown[])[] = [routeViewKeys.detail(plan.routePlanId), ["route-view", "list", plan.transportPlanId]]
  const updatesWorkspace = action === "decision" || action === "activation"
  await Promise.all([
    ...keys.map(queryKey => client.invalidateQueries({ queryKey })),
    ...(updatesWorkspace ? [
      client.invalidateQueries({ queryKey: transportPlanKeys.detail(plan.transportPlanId) }),
      client.invalidateQueries({ queryKey: approvedBookingKeys.detail(plan.bookingId) }),
      client.invalidateQueries({ queryKey: ["approved-bookings", "list"] }),
      // Invalidate only already-cached route details of this transport, not every route.
      client.invalidateQueries({ predicate: query => query.queryKey[0] === "route-view" && query.queryKey[1] === "detail" &&
        query.queryKey[2] !== plan.routePlanId && (query.state.data as RoutePlanDetail | undefined)?.transportPlanId === plan.transportPlanId }),
    ] : []),
  ])
}

export function useEmergencyMutation<A extends EmergencyAction>(action: A, plan: RoutePlanDetail, context: EmergencyContext) {
  const client = useQueryClient()
  return useMutation({ mutationKey: ["route-view", "emergency", plan.routePlanId], retry: false,
    mutationFn: (input: EmergencyRequestMap[A]) => {
      const workspace = { ...context.workspace, principal: useAuthStore.getState().principal }
      if (!getEmergencyActions(plan, workspace).includes(action)) throw new Error("This emergency action is not available for the current route and transport.")
      return executeEmergencyAction(action, plan.routePlanId, input)
    },
    onSuccess: () => refreshEmergencyQueries(client, plan, action),
    onError: async error => {
      const { code } = getApiErrorInfo(error)
      if (["ROUTE_PLAN_MODIFIED", "INVALID_ROUTE_PLAN_STATUS", "TRANSPORT_NOT_IN_TRANSIT", "DOSSIER_NOT_APPROVED"].includes(code ?? "")) {
        // Refresh, but never resubmit. The form retains its input/version until explicit review.
        await refreshEmergencyQueries(client, plan, action)
      }
    },
  })
}
