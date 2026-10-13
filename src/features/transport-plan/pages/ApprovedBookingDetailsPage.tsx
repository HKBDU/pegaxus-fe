import { useParams } from "react-router-dom"
import { ROLE_ROUTES } from "@/app/route-config"
import { useAuthStore } from "@/features/auth/store"
import { BookingDetailsSkeleton } from "@/features/booking/components/BookingPageSkeletons"
import { ApprovedBookingBadge } from "../components/ApprovedBookingBadge"
import { PageHeader } from "@/shared/components/PageHeader"
import { ErrorState } from "@/shared/components/common"
import { ApprovedBookingDetails } from "../components/ApprovedBookingDetails"
import { useApprovedBooking } from "../hooks/useApprovedBookings"
import { getApprovedBookingError } from "../services"
import { actionEntityIdSchema } from "../schemas"
import { Flow3MockIndicator } from "../components/Flow3MockIndicator"
import { TransportWorkspace } from "../components/TransportWorkspace"
import { TransportOverview } from "../components/TransportOverview"
import { getWorkspaceRole } from "../workspace-role"
import { workspaceLabels } from "../constants"

export default function ApprovedBookingDetailsPage() {
  const { bookingId = "" } = useParams<{ bookingId: string }>()
  const principal = useAuthStore((state) => state.principal)
  const role = getWorkspaceRole(principal)
  const query = useApprovedBooking(bookingId)
  const booking = query.data
  const error = query.isError ? getApprovedBookingError(query.error) : null

  return <div className="booking-page-shell min-w-0 min-h-[calc(100svh-5rem)] px-4 py-6 font-sans sm:px-6 lg:px-8 lg:py-8">
    <div className="mx-auto w-full min-w-0 max-w-[1152px] space-y-5">
      <Flow3MockIndicator />
      <div>
        <PageHeader className="[&_h1]:text-2xl [&_h1]:leading-tight sm:[&_h1]:text-3xl" title="Transport Detail" backHref={ROLE_ROUTES.approvedBookings} backLabel={`Back to ${role ? workspaceLabels[role].list : "Transports"}`} />
        <p className="text-xs text-slate-500 sm:text-sm">Review transport operations, planning references and the approved booking. Booking information is read-only.</p>
      </div>
      {!actionEntityIdSchema.safeParse(bookingId).success ? <ErrorState message="The booking identifier is invalid." /> : error ?
        <ErrorState message={error.message} onRetry={error.retryable ? () => void query.refetch() : undefined} /> :
        query.isPending ? <BookingDetailsSkeleton /> : booking ? <>
          <div className="flex flex-col justify-between gap-4 rounded-[2px] border border-slate-200 border-l-2 border-l-primary bg-linear-to-r from-white to-primary/5 p-4 shadow-xs sm:flex-row sm:items-center">
            <div className="min-w-0 space-y-2"><h2 className="break-words font-heading text-2xl">{booking.transport?.transportCode ?? "Transport not available"}</h2>
              <p className="text-xs text-slate-500">Booking Reference: {booking.bookingCode}</p>
              {booking.transport && <ApprovedBookingBadge value={booking.transport.status} />}</div>
          </div>
          <TransportOverview journey={booking} customerName={booking.customer.fullName} plannedStartAt={booking.transportPlan?.plannedStartAt} transportStatus={booking.transport?.status} />
          <TransportWorkspace booking={booking} principal={principal} />
          <details className="min-w-0">
            <summary className="cursor-pointer rounded-[2px] border border-slate-200 bg-slate-50 px-4 py-3 font-heading text-base uppercase outline-none transition-colors duration-200 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary/30 motion-reduce:transition-none">Booking &amp; Customer Details</summary>
            <div className="mt-3"><ApprovedBookingDetails booking={booking} showDossier={role === "manager" || role === "specialist"} /></div>
          </details>
        </> : null}
    </div>
  </div>
}
