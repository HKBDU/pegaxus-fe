import { useParams, useSearchParams } from "react-router-dom"
import { ROLE_ROUTES } from "@/app/route-config"
import { useAuthStore } from "@/features/auth/store"
import { BookingDetailsSkeleton } from "@/features/booking/components/BookingPageSkeletons"
import { BookingStatusBadge } from "@/features/booking/components/BookingStatusBadge"
import { PageHeader } from "@/shared/components/PageHeader"
import { ErrorState } from "@/shared/components/common"
import { ApprovedBookingDetails } from "../components/ApprovedBookingDetails"
import { ApprovedBookingPlanningAction } from "../components/ApprovedBookingPlanningAction"
import { useApprovedBooking } from "../hooks/useApprovedBookings"
import { getApprovedBookingError } from "../services"
import CreateTransportPlanPage from "./CreateTransportPlanPage"
import { entityIdSchema } from "../schemas"

function ApprovedBookingReadPage() {
  const { bookingId = "" } = useParams<{ bookingId: string }>()
  const principal = useAuthStore((state) => state.principal)
  const query = useApprovedBooking(bookingId)
  const booking = query.data
  const error = query.isError ? getApprovedBookingError(query.error) : null

  return <div className="booking-page-shell min-h-[calc(100svh-5rem)] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
    <div className="booking-page-enter mx-auto w-full max-w-[1152px] space-y-5">
      <div>
        <PageHeader title="Approved Booking Details" backHref={ROLE_ROUTES.approvedBookings} backLabel="Back to approved bookings" />
        <p className="text-xs text-slate-500 sm:text-sm">Review the approved booking and its transport planning status. Booking information is read-only.</p>
      </div>
      {!entityIdSchema.safeParse(bookingId).success ? <ErrorState message="The booking identifier is invalid." /> : error ?
        <ErrorState message={error.message} onRetry={error.retryable ? () => void query.refetch() : undefined} /> :
        query.isPending ? <BookingDetailsSkeleton /> : booking ? <>
          <div className="flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-center">
            <div className="space-y-2"><h2 className="font-heading text-2xl">{booking.bookingCode}</h2><BookingStatusBadge status={booking.status} audience="manager" /></div>
            <ApprovedBookingPlanningAction principal={principal} booking={booking} />
          </div>
          <ApprovedBookingDetails booking={booking} />
        </> : null}
    </div>
  </div>
}

export default function ApprovedBookingDetailsPage() {
  const [params] = useSearchParams()
  return params.get("action") === "create-plan" ? <CreateTransportPlanPage /> : <ApprovedBookingReadPage />
}
