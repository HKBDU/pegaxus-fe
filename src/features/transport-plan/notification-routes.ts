import { transportPlanDetail } from "@/app/route-config";
import { canAccess } from "@/features/auth/access-control";
import { registerNotificationRoute } from "@/shared/realtime";

// Customers also get TransportPlan notifications but have no transport plan page: they fall back to the inbox.
registerNotificationRoute("TransportPlan", (id, principal) =>
  canAccess(principal, {
    anyRole: [
      "LOGISTICS_MANAGER",
      "FLEET_ROUTE_COORDINATOR",
      "TRANSPORT_SPECIALIST",
    ],
  })
    ? transportPlanDetail(id)
    : null,
);
