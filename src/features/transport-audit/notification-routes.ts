import { canAccess } from "@/features/auth/access-control";
import { registerNotificationRoute } from "@/shared/realtime";
import { transportAudit } from "@/app/route-config";
registerNotificationRoute("Transport", (id, principal) =>
  canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })
    ? transportAudit(id)
    : null,
);
registerNotificationRoute("AuditExport", (id, principal) =>
  canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })
    ? `/admin/transport-archive?exportId=${encodeURIComponent(id)}`
    : null,
);
