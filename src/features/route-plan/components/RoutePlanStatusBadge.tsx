import { Badge } from "@/shared/components/ui/badge";
import type { RoutePlanStatus } from "../types";
import {
  REJECTED_BY_MANAGER,
  ROUTE_PLAN_STATUS_LABELS,
} from "@/shared/constants/route-plan-status";

const statusClasses: Record<RoutePlanStatus, string> = {
  DRAFT: "border-slate-300 bg-slate-200 text-slate-700",
  CONFIRMED: "border-yellow-300 bg-yellow-100 text-yellow-800",
  ACTIVE: "border-green-300 bg-green-100 text-green-800",
  COMPLETED: "border-slate-900 bg-slate-900 text-white",
  CANCELLED: "border-red-300 bg-red-100 text-red-800",
  REJECTED_BY_MANAGER: "border-red-300 bg-red-50 text-red-800",
};

export function RoutePlanStatusBadge({ status }: { status: RoutePlanStatus }) {
  return (
    <Badge variant="outline" className={statusClasses[status]}>
      {status === REJECTED_BY_MANAGER
        ? ROUTE_PLAN_STATUS_LABELS[status]
        : status}
    </Badge>
  );
}
