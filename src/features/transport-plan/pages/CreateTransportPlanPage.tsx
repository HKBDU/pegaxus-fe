import { Link, useParams } from "react-router-dom"
import { approvedBookingDetail, transportPlanDetail } from "@/app/route-config"
import { canAccess } from "@/features/auth/access-control"
import { useAuthStore } from "@/features/auth/store"
import { BookingDetailsSkeleton } from "@/features/booking/components/BookingPageSkeletons"
import { PageHeader } from "@/shared/components/PageHeader"
import { ErrorState } from "@/shared/components/common"
import { Button } from "@/shared/components/ui/button"
import { useApprovedBooking } from "../hooks/useApprovedBookings"
import { entityIdSchema } from "../schemas"
import { getApprovedBookingError } from "../services"
import { TransportPlanMetadataForm } from "../components/TransportPlanMetadataForm"
import { Section, Field } from "../components/ApprovedBookingDetails"

export default function CreateTransportPlanPage() {
  const { bookingId = "" } = useParams<{ bookingId: string }>()
  const principal = useAuthStore((state) => state.principal)
  const allowed = canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })
  const query = useApprovedBooking(bookingId, allowed)
  const booking = query.data
  const error = query.isError ? getApprovedBookingError(query.error) : null
  return <div className="booking-page-shell min-w-0 min-h-[calc(100svh-5rem)] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
    <div className="booking-page-enter mx-auto w-full min-w-0 max-w-[1152px] space-y-5">
      <PageHeader title="Create Transport Plan" backHref={approvedBookingDetail(bookingId)} backLabel="Back to Booking" />
      {!allowed ? <ErrorState message="Only Logistics Managers can create transport plans." /> : !entityIdSchema.safeParse(bookingId).success ? <ErrorState message="The booking identifier is invalid." /> : error ? <ErrorState message={error.message} onRetry={error.retryable ? () => void query.refetch() : undefined} /> : query.isPending ? <BookingDetailsSkeleton /> : booking ? <>
        <Section title="Booking Summary"><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Booking">{booking.bookingCode}</Field><Field label="Customer">{booking.customer.fullName}</Field><Field label="Horses">{String(booking.totalHorses)}</Field>
          <Field label="Origin">{booking.originAddress} ({booking.originCountry})</Field><Field label="Destination">{booking.destinationAddress} ({booking.destinationCountry})</Field>
          <Field label="Requested dates">{booking.requestedDepartureDate} → {booking.requestedArrivalDate}</Field>
        </dl></Section>
        {booking.transportPlan ? <Section title="Transport Plan Already Exists"><p className="text-sm text-slate-600">This booking already has a transport plan. Open it to review or edit its metadata.</p><Button asChild className="rounded-[2px]"><Link to={transportPlanDetail(booking.transportPlan.transportPlanId)}>View Transport Plan</Link></Button></Section> :
          <TransportPlanMetadataForm bookingId={bookingId} cancelHref={approvedBookingDetail(bookingId)} onDuplicate={() => query.refetch()} />}
      </> : null}
    </div>
  </div>
}
