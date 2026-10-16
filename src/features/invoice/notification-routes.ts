import { invoiceDetail } from "@/app/route-config";
import { canAccess } from "@/features/auth/access-control";
import { registerNotificationRoute } from "@/shared/realtime";

// A customer opens an invoice under its booking (/bookings/:bookingId/invoices/:invoiceId) and the realtime push has
// no bookingId, so customers fall back to the inbox until the BE sends `actionUrl` or `bookingId`.
registerNotificationRoute("Invoice", (id, principal) =>
  canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })
    ? invoiceDetail(id)
    : null,
);
