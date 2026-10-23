import { canAccess } from "@/features/auth/access-control"
import { registerNotificationRoute } from "@/shared/realtime"

import { incidentRoutes } from "./constants"

// `IncidentHold` and `EmergencyCostRequest` are registered by the incident-response feature.
registerNotificationRoute("IncidentReport", (id, principal) => {
  if (canAccess(principal, { anyRole: ["LOGISTICS_MANAGER", "FLEET_ROUTE_COORDINATOR", "TRANSPORT_SPECIALIST"] })) return incidentRoutes.adminDetail(id)
  if (canAccess(principal, { anyRole: ["DRIVER", "ESCORT"] })) return incidentRoutes.crewDetail(id)
  // The Customer page needs the booking and transport ids, which only the BE `actionUrl` carries; without it the inbox opens.
  return null
})
