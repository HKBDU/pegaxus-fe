import { useAuthStore } from "@/features/auth/store"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { ErrorState } from "@/shared/components/common"
import { useApprovedBooking } from "../hooks/useApprovedBookings"
import { getApprovedBookingError } from "../services"
import type { TransportPlanDetail } from "../transport-plan.types"
import { TransportWorkspace } from "./TransportWorkspace"

// One AB2 read for the selected plan supplies dossier/horse context absent from TP3.
export function TransportPlanWorkspace({ plan }: { plan: TransportPlanDetail }) {
  const principal = useAuthStore(state => state.principal)
  const query = useApprovedBooking(plan.booking.bookingId, Boolean(principal))
  if (query.isPending) return <Skeleton aria-label="Loading transport workspace" className="h-40 w-full" />
  if (query.isError) {
    const error = getApprovedBookingError(query.error)
    return <ErrorState message={error.message} onRetry={error.retryable ? () => void query.refetch() : undefined} />
  }
  if (!query.data) return null
  // Do not combine context from a different/latest plan with the selected TP3 record.
  if (query.data.transportPlan?.transportPlanId !== plan.transportPlanId) return <p className="text-sm text-slate-500">The transport workspace belongs to the latest plan. Refresh the transport detail to select that plan.</p>
  return <TransportWorkspace principal={principal} showPlanningReference={false} booking={{ ...query.data, transportPlan: plan, transport: plan.transport }} />
}
