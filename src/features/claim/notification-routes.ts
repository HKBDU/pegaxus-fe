import { claimDetail } from "@/app/route-config"
import { canAccess } from "@/features/auth/access-control"
import { registerNotificationRoute } from "@/shared/realtime"

// LM -> the claim modal on /admin/claims/:id. A customer opens a claim under its booking and the realtime push carries no
// bookingId, so customers use the BE's `actionUrl` (/bookings/{id}?claimId=...) and otherwise land in the inbox.
registerNotificationRoute("Claim", (id, principal) => (canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] }) ? claimDetail(id) : null))
