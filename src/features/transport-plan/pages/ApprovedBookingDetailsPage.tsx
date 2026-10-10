import { useParams, useSearchParams } from "react-router-dom"
import { ROLE_ROUTES } from "@/app/route-config"
import { useAuthStore } from "@/features/auth/store"
import { BookingDetailsSkeleton } from "@/features/booking/components/BookingPageSkeletons"
import { ApprovedBookingBadge } from "../components/ApprovedBookingBadge"
import { PageHeader } from "@/shared/components/PageHeader"
import { ErrorState } from "@/shared/components/common"
import { ApprovedBookingDetails } from "../components/ApprovedBookingDetails"
import { ApprovedBookingPlanningAction } from "../components/ApprovedBookingPlanningAction"
import { useApprovedBooking } from "../hooks/useApprovedBookings"
import { getApprovedBookingError } from "../services"
import CreateTransportPlanPage from "./CreateTransportPlanPage"
import { entityIdSchema } from "../schemas"
import { Flow3MockIndicator } from "../components/Flow3MockIndicator"
import { TransportWorkspace } from "../components/TransportWorkspace"
import { TransportOverview } from "../components/TransportOverview"
import { getWorkspaceRole, workspaceLabels } from "../workspace-role"

function ApprovedBookingReadPage() {
  const { bookingId = "" } = useParams<{ bookingId: string }>()
  const principal = useAuthStore((state) => state.principal)
  const role = getWorkspaceRole(principal)
  const query = useApprovedBooking(bookingId)
  const booking = query.data
  const error = query.isError ? getApprovedBookingError(query.error) : null

  return <div className="booking-page-shell min-w-0 min-h-[calc(100svh-5rem)] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
    <div className="booking-page-enter mx-auto w-full min-w-0 max-w-[1152px] space-y-5">
      <Flow3MockIndicator />
      <div>
        <PageHeader title="Transport Detail" backHref={ROLE_ROUTES.approvedBookings} backLabel={`Back to ${role ? workspaceLabels[role].list : "Transports"}`} />
        <p className="text-xs text-slate-500 sm:text-sm">Review transport operations, planning references and the approved booking. Booking information is read-only.</p>
      </div>
      {!entityIdSchema.safeParse(bookingId).success ? <ErrorState message="The booking identifier is invalid." /> : error ?
        <ErrorState message={error.message} onRetry={error.retryable ? () => void query.refetch() : undefined} /> :
        query.isPending ? <BookingDetailsSkeleton /> : booking ? <>
          <div className="flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-center">
            <div className="space-y-2"><h2 className="font-heading text-2xl">{booking.transport?.transportCode ?? "Transport not available"}</h2>
              <p className="text-xs text-slate-500">Booking Reference: {booking.bookingCode}</p>
              {booking.transport && <ApprovedBookingBadge value={booking.transport.status} />}</div>
            <ApprovedBookingPlanningAction principal={principal} booking={booking} />
          </div>
          <TransportOverview journey={booking} customerName={booking.customer.fullName} plannedStartAt={booking.transportPlan?.plannedStartAt} />
          <TransportWorkspace booking={booking} principal={principal} />
          <details className="min-w-0 rounded-[2px] border border-slate-200 bg-white p-4">
            <summary className="cursor-pointer font-heading text-base uppercase">Booking &amp; Customer Details</summary>
            <div className="mt-4"><ApprovedBookingDetails booking={booking} showDossier={role === "manager" || role === "specialist"} /></div>
          </details>
        </> : null}
    </div>
  </div>
}

export default function ApprovedBookingDetailsPage() {
  const [params] = useSearchParams()
  return params.get("action") === "create-plan" ? <CreateTransportPlanPage /> : <ApprovedBookingReadPage />
}
