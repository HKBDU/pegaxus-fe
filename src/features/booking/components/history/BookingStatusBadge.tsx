import { Badge } from "@/shared/components/ui/badge";
import { formatHistoryLabel } from "../../history/utils";
import { BookingStatusBadge as BookingListStatusBadge } from "../BookingStatusBadge";
import { BOOKING_STATUSES } from "../../types";

const bookingStatusStyles = {
  UNDER_REVIEW: { badge: "border-blue-300 bg-blue-50 text-blue-800", dot: "bg-blue-600" },
} as const;

type StyledStatus = keyof typeof bookingStatusStyles;

export function BookingStatusBadge({ status }: { status: string }) {
  const knownStatus = BOOKING_STATUSES.find((value) => value === status);
  if (knownStatus) return <BookingListStatusBadge status={knownStatus} />;
  const style = Object.hasOwn(bookingStatusStyles, status)
    ? bookingStatusStyles[status as StyledStatus]
    : { badge: "border-neutral-300 bg-white text-neutral-700", dot: "bg-neutral-500" };
  return (
    <Badge
      variant="outline"
      className={`inline-flex h-5 w-fit items-center gap-1 rounded-full border px-1.5 py-0 text-[0.65rem] font-medium leading-none ${style.badge}`}
    >
      <span aria-hidden="true" className={`size-1 rounded-full ${style.dot}`} />
      {formatHistoryLabel(status)}
    </Badge>
  );
}
