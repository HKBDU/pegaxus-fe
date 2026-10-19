import { canAccess } from "@/features/auth/access-control"
import { registerNotificationRoute } from "@/shared/realtime"

registerNotificationRoute("Booking", (id, principal) => {
  if (canAccess(principal, { anyRole: ["CUSTOMER"] })) return `/bookings/${encodeURIComponent(id)}`
  if (canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })) return `/admin/transport-requests/${encodeURIComponent(id)}`
  return null
})
