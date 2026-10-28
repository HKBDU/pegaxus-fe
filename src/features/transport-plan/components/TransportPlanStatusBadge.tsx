import { BookingStatusBadge } from "@/features/booking/components/BookingStatusBadge";
import type { TransportPlanStatus } from "../types";
import { ApprovedBookingBadge } from "./ApprovedBookingBadge";

export function TransportPlanStatusBadge({
  status,
}: {
  status: TransportPlanStatus;
}) {
  if (status !== "DRAFT" && status !== "PENDING" && status !== "APPROVED")
    return <ApprovedBookingBadge value={status} />;
  return (
    <BookingStatusBadge
      status={status}
      audience="manager"
      className="rounded-full px-2 text-[10px]"
    />
  );
}
