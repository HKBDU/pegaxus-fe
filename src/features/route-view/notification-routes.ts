import { routePlanDetail } from "@/app/route-config"
import { canAccess } from "@/features/auth/access-control"
import { registerNotificationRoute } from "@/shared/realtime"

// The route plan pages are for LM, RC and TS only. Drivers, escorts and customers also receive RoutePlan notifications
// (return activated, personnel assigned...) but would be sent to /unauthorized, so they get no link.
registerNotificationRoute("RoutePlan", (id, principal) =>
  canAccess(principal, { anyRole: ["LOGISTICS_MANAGER", "FLEET_ROUTE_COORDINATOR", "TRANSPORT_SPECIALIST"] }) ? routePlanDetail(id) : null,
)
