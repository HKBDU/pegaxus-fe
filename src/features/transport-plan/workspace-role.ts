import { canAccess } from "@/features/auth/access-control"
import type { AuthPrincipal } from "@/features/auth/types"

// Presentation only. AB1/AB2 authorize the authenticated employee's assignment on the server.
export function getWorkspaceRole(principal: AuthPrincipal | null) {
  if (canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })) return "manager"
  if (canAccess(principal, { anyRole: ["FLEET_ROUTE_COORDINATOR"] })) return "coordinator"
  if (canAccess(principal, { anyRole: ["TRANSPORT_SPECIALIST"] })) return "specialist"
  return null
}

export const workspaceLabels = {
  manager: { list: "Transport Management", workspace: "Management Workspace" },
  coordinator: { list: "Assigned Transports", workspace: "Route Coordinator Workspace" },
  specialist: { list: "Assigned Transports", workspace: "Transport Specialist Workspace" },
} as const
