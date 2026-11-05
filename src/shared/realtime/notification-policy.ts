import type { AuthPrincipal } from "@/features/auth/types"
import type { AppNotification } from "./types"

/** Route-plan legal review notifications are internal; customers must not see them. */
export function isNotificationVisibleToPrincipal(
  notification: AppNotification,
  principal: AuthPrincipal | null,
) {
  return !(principal?.roles.includes("CUSTOMER") && notification.referenceType === "RoutePlan")
}
