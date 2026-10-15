import { BookingStatusBadge } from "@/features/booking/components/BookingStatusBadge"
import type { TransportPlanStatus } from "../types"
import { ApprovedBookingBadge } from "./ApprovedBookingBadge"

export function TransportPlanStatusBadge({ status }: { status: TransportPlanStatus }) {
  if (status === "IN_PROGRESS" || status === "COMPLETED") return <ApprovedBookingBadge value={status} />
  return <BookingStatusBadge status={status} audience="manager" className="rounded-full px-2 text-[10px]" />
}
