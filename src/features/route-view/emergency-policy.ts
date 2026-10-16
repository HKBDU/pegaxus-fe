import type { AuthPrincipal } from "@/features/auth/types"
import { getWorkspaceRole } from "@/features/transport-plan/workspace-role"
import type { RouteWorkspaceContext } from "./workspace-actions"
import type { EmergencyAction, RoutePlanSummary } from "./types"

export const emergencyActionLabels: Record<EmergencyAction, string> = {
  request: "Request Backup Activation", decision: "Review Route Change", activation: "Activate Return", notice: "Notify Driver",
}
export function canUseEmergencyAction(action: EmergencyAction, principal: AuthPrincipal | null) {
  const role = getWorkspaceRole(principal)
  return action === "request" || action === "notice" ? role === "coordinator" : role === "manager"
}

// Presentation policy only. Scoped API reads and server authorization remain mandatory.
// Replace this boundary with the owner's shared status policy when it is exported.
export function getEmergencyActions(route: Pick<RoutePlanSummary, "routeType" | "status">, context: RouteWorkspaceContext): EmergencyAction[] {
  if (context.transportStatus !== "IN_TRANSIT") return []
  const role = getWorkspaceRole(context.principal)
  if (role === "coordinator") {
    if (route.routeType === "BACKUP" && route.status === "CONFIRMED" && context.hasActivePrimary === true) return ["request"]
    if (route.routeType === "RETURN" && (route.status === "CONFIRMED" || route.status === "ACTIVE")) return ["notice"]
  }
  if (role === "manager") {
    if (route.routeType === "BACKUP" && route.status === "CONFIRMED") return ["decision"]
    if (route.routeType === "RETURN" && route.status === "DRAFT" && context.dossierStatus === "APPROVED") return ["decision"]
    if (route.routeType === "RETURN" && route.status === "CONFIRMED") return ["activation"]
  }
  return []
}

export function emergencyActionPath(detailPath: string, action: EmergencyAction) {
  const [path, query] = detailPath.split("?")
  const params = new URLSearchParams(query)
  params.set("emergency", action)
  return `${path}?${params}`
}
