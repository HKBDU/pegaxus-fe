import { Badge } from "@/shared/components/ui/badge";
import { formatHistoryLabel } from "../../history/utils";

const bookingStatusStyles = {
  DRAFT: { badge: "border-neutral-300 bg-neutral-50 text-neutral-700", dot: "bg-neutral-500" },
  PENDING: { badge: "border-amber-300 bg-amber-50 text-amber-800", dot: "bg-amber-600" },
  UNDER_REVIEW: { badge: "border-blue-300 bg-blue-50 text-blue-800", dot: "bg-blue-600" },
  APPROVED: { badge: "border-green-300 bg-green-50 text-green-800", dot: "bg-green-600" },
  REJECTED: { badge: "border-red-300 bg-red-50 text-red-800", dot: "bg-red-600" },
  CANCELLED: { badge: "border-slate-300 bg-slate-50 text-slate-700", dot: "bg-slate-500" },
} as const;

type StyledStatus = keyof typeof bookingStatusStyles;

export function BookingStatusBadge({ status }: { status: string }) {
  const style = Object.hasOwn(bookingStatusStyles, status)
    ? bookingStatusStyles[status as StyledStatus]
    : { badge: "border-neutral-300 bg-white text-neutral-700", dot: "bg-neutral-500" };
  return (
    <Badge
      variant="outline"
      className={`rounded-[2px] px-1.5 py-0.5 text-[11px] font-medium ${style.badge}`}
    >
      <span aria-hidden="true" className={`size-1.5 rounded-full ${style.dot}`} />
      {formatHistoryLabel(status)}
    </Badge>
  );
}
