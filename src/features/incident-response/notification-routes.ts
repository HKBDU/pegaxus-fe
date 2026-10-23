import { registerNotificationRoute } from "@/shared/realtime";
import { canAccess } from "@/features/auth/access-control";
import { canReadEmergencyCosts } from "./services";
import { emergencyCostIdSchema } from "./schemas";
import { emergencyCostDetailPath } from "./navigation";

registerNotificationRoute("EmergencyCostRequest", (id, principal) => {
  if (
    !canReadEmergencyCosts(principal) ||
    !emergencyCostIdSchema.safeParse(id).success
  )
    return null;
  const admin = canAccess(principal, {
    anyRole: [
      "LOGISTICS_MANAGER",
      "FLEET_ROUTE_COORDINATOR",
      "TRANSPORT_SPECIALIST",
    ],
  });
  return emergencyCostDetailPath(admin ? "admin" : "crew", id);
});
