import { useParams } from "react-router-dom"
import { transportPlanDetail } from "@/app/route-config"
import { canAccess } from "@/features/auth/access-control"
import { useAuthStore } from "@/features/auth/store"
import { BookingDetailsSkeleton } from "@/features/booking/components/BookingPageSkeletons"
import { PageHeader } from "@/shared/components/PageHeader"
import { ErrorState } from "@/shared/components/common"
import { useTransportPlan } from "../hooks/useTransportPlans"
import { actionEntityIdSchema } from "../schemas"
import { getTransportPlanError } from "../services"
import { canEditTransportPlan } from "../transport-plan.form"
import { TransportPlanMetadataForm } from "../components/TransportPlanMetadataForm"
import { TransportPlanStatusBadge } from "../components/TransportPlanStatusBadge"
import { Section, Field } from "../components/ApprovedBookingDetails"

export default function EditTransportPlanPage() {
  const { transportPlanId = "" } = useParams<{ transportPlanId: string }>()
  const principal = useAuthStore((state) => state.principal)
  const allowed = canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })
  const query = useTransportPlan(transportPlanId, allowed)
  const plan = query.data
  const error = query.isError ? getTransportPlanError(query.error) : null
  return <div className="booking-page-shell min-w-0 min-h-[calc(100svh-5rem)] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
    <div className="booking-page-enter mx-auto w-full min-w-0 max-w-[1152px] space-y-5">
      <PageHeader title="Edit Transport Plan" backHref={transportPlanDetail(transportPlanId)} backLabel="Back to Transport Plan" />
      {!allowed ? <ErrorState message="Only Logistics Managers can edit transport plans." /> : !actionEntityIdSchema.safeParse(transportPlanId).success ? <ErrorState message="The transport plan identifier is invalid." /> : error ? <ErrorState message={error.message} onRetry={error.retryable ? () => void query.refetch() : undefined} /> : query.isPending ? <BookingDetailsSkeleton /> : plan ? <>
        <Section title="Plan Summary"><dl className="grid gap-4 sm:grid-cols-3"><Field label="Plan code">{plan.planCode}</Field><Field label="Status"><TransportPlanStatusBadge status={plan.status} /></Field><Field label="Booking">{plan.booking.bookingCode}</Field></dl></Section>
        {!canEditTransportPlan(principal, plan) ? <ErrorState message="This transport plan is locked and cannot be edited." /> :
          <TransportPlanMetadataForm key={transportPlanId} bookingId={plan.booking.bookingId} plan={plan} cancelHref={transportPlanDetail(transportPlanId)} reloadLatest={async () => {
            const result = await query.refetch(); if (result.error) throw result.error; return result.data
          }} />}
      </> : null}
    </div>
  </div>
}
