import { canAccess } from "@/features/auth/access-control"
import { useAuthStore } from "@/features/auth/store"

/** Who is looking: drives the audience of the screens (never the buttons; those come from `availableActions`). */
export function useIncidentViewer() {
  const principal = useAuthStore((state) => state.principal)
  const isCustomer = canAccess(principal, { anyRole: ["CUSTOMER"] })
  const isCrew = canAccess(principal, { anyRole: ["DRIVER", "ESCORT"] })
  const isManager = canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })
  const isCoordinator = canAccess(principal, { anyRole: ["FLEET_ROUTE_COORDINATOR"] })
  const isSpecialist = canAccess(principal, { anyRole: ["TRANSPORT_SPECIALIST"] })
  return { principal, isCustomer, isCrew, isManager, isCoordinator, isSpecialist, isAdminStaff: isManager || isCoordinator || isSpecialist }
}
