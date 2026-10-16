import type { AuthPrincipal } from "@/features/auth/types"
import { contingencyRouteCreate, routePlanCreate, routePlanEdit } from "@/app/route-config"
import { getWorkspaceRole } from "@/features/transport-plan/workspace-role"
import type { RoutePlanSummary } from "./types"

export type RouteWorkspaceContext = {
  principal: AuthPrincipal | null
  planStatus: string
  transportStatus?: string | null
  dossierStatus?: string | null
  hasActivePrimary?: boolean
  hasOpenReturn?: boolean
}
/** `href` set = the page exists and the action is a link; without it the action stays a disabled placeholder. */
export type PendingRouteAction = { label: string; reason: string; href?: string }
export const beforeDeparture = (status?: string | null) => Boolean(status && ["CREATED", "PLANNING", "READY"].includes(status))

// UI eligibility until the owner's shared policy and mutation entry points are available.
// Successful scoped reads are required; these predicates do not grant server authorization.
export function getPendingRouteActions(route: RoutePlanSummary, context: RouteWorkspaceContext): PendingRouteAction[] {
  const role = getWorkspaceRole(context.principal)
  if (context.planStatus !== "APPROVED" || !beforeDeparture(context.transportStatus) || route.status !== "DRAFT" || route.routeType === "RETURN") return []
  if (role === "coordinator") return [
    { label: "Edit Route", reason: "Route editing is not available yet.", href: routePlanEdit(route.routePlanId) },
    { label: "Cancel Draft Route", reason: "Route cancellation is not available yet." },
    { label: "Submit for Legal Review", reason: "Route submission is not available yet." },
  ]
  if (role === "specialist" && context.dossierStatus === "DRAFT") return [
    { label: "Review Legal Feasibility", reason: "Legal review submission is not available yet." },
  ]
  return []
}

export function getPendingRouteCreation(routes: RoutePlanSummary[], context: RouteWorkspaceContext, transportPlanId?: string): PendingRouteAction | null {
  if (getWorkspaceRole(context.principal) !== "coordinator" || context.planStatus !== "APPROVED" || !beforeDeparture(context.transportStatus)) return null
  const primary = routes.find(route => route.routeType === "PRIMARY" && route.status !== "CANCELLED")
  if (!primary) return { label: "Create Primary Route", reason: "Route creation is not available yet.", ...(transportPlanId ? { href: routePlanCreate(transportPlanId) } : {}) }
  if (context.dossierStatus && !["DRAFT", "IN_PREPARATION"].includes(context.dossierStatus)) return null
  return { label: "Add Backup Route", reason: "Backup route management is not available yet.", ...(transportPlanId ? { href: contingencyRouteCreate(transportPlanId) } : {}) }
}
