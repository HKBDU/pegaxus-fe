import { Link, useParams } from "react-router-dom"
import { transportPlanDetail } from "@/app/route-config"
import { canAccess } from "@/features/auth/access-control"
import { useAuthStore } from "@/features/auth/store"
import { BookingDetailsSkeleton } from "@/features/booking/components/BookingPageSkeletons"
import { PageHeader } from "@/shared/components/PageHeader"
import { ErrorState } from "@/shared/components/common"
import { Button } from "@/shared/components/ui/button"
import { useApprovedBooking } from "../hooks/useApprovedBookings"
import { actionEntityIdSchema } from "../schemas"
import { getApprovedBookingError } from "../services"
import { CreateTransportPlanContent } from "../components/BookingTransportPlanAction"
import { managerBookingDetailPath } from "../approved-booking-actions"
import { Section } from "../components/ApprovedBookingDetails"

export default function CreateTransportPlanPage() {
  const { bookingId = "" } = useParams<{ bookingId: string }>()
  const principal = useAuthStore((state) => state.principal)
  const allowed = canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })
  const query = useApprovedBooking(bookingId, allowed)
  const booking = query.data
  const valid = actionEntityIdSchema.safeParse(bookingId).success
  const error = query.isError ? getApprovedBookingError(query.error) : null
  return <div className="booking-page-shell min-w-0 min-h-[calc(100svh-5rem)] px-4 py-6 font-sans sm:px-6 lg:px-8 lg:py-8">
    <div className="mx-auto w-full min-w-0 max-w-[1152px] space-y-5">
      <PageHeader className="[&_h1]:text-2xl [&_h1]:leading-tight sm:[&_h1]:text-3xl" title="Create Transport Plan" backHref={valid ? managerBookingDetailPath(bookingId) : "/admin/transport-requests"} backLabel="Back to Booking" />
      {!allowed ? <ErrorState message="Only Logistics Managers can create transport plans." /> : !valid ? <ErrorState message="The booking identifier is invalid." /> : error ? <ErrorState message={error.message} onRetry={error.retryable ? () => void query.refetch() : undefined} /> : query.isPending ? <BookingDetailsSkeleton /> : booking ? <>
        {booking.transportPlan ? <Section title="Transport Plan Already Exists"><p className="text-sm text-slate-600">This booking already has a transport plan. Open it to review or edit its metadata.</p><Button asChild className="rounded-[2px]"><Link to={transportPlanDetail(booking.transportPlan.transportPlanId)}>View Transport Plan</Link></Button></Section> : !booking.transport ? <ErrorState message="The approved booking has no transport. A transport must exist before creating its plan." /> :
          <CreateTransportPlanContent booking={booking} onDuplicate={() => query.refetch()} />}
      </> : null}
    </div>
  </div>
}
