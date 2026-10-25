import { Badge } from "@/shared/components/ui/badge";
import {
  REJECTED_BY_MANAGER,
  ROUTE_PLAN_STATUS_LABELS,
} from "@/shared/constants/route-plan-status";

const tones: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  DRAFT: "border-slate-200 bg-slate-100 text-slate-600",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CONFIRMED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ACTIVE: "border-blue-200 bg-blue-50 text-blue-700",
  CANCELLED: "border-red-200 bg-red-50 text-red-700",
  REJECTED: "border-red-200 bg-red-50 text-red-700",
  REJECTED_BY_MANAGER: "border-red-200 bg-red-50 text-red-700",
  IN_PROGRESS: "border-blue-200 bg-blue-50 text-blue-700",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PRIMARY: "border-primary/30 bg-primary/10 text-slate-900",
  BACKUP: "border-slate-200 bg-slate-100 text-slate-700",
  RETURN: "border-violet-200 bg-violet-50 text-violet-700",
};

export function ApprovedBookingBadge({ value }: { value: string }) {
  return (
    <Badge
      variant="outline"
      className={`h-5 whitespace-nowrap rounded-full px-2 py-0 text-[10px] font-medium leading-none ${tones[value] ?? "border-slate-200 bg-slate-50 text-slate-600"}`}
    >
      {value === REJECTED_BY_MANAGER
        ? ROUTE_PLAN_STATUS_LABELS[value]
        : value
            .replaceAll("_", " ")
            .toLowerCase()
            .replace(/^./, (letter) => letter.toUpperCase())}
    </Badge>
  );
}
