import type { ComponentType } from "react"
import { Tabs } from "radix-ui"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { ROLE_ROUTES } from "@/app/route-config"
import { PageHeader } from "@/shared/components/PageHeader"
import { ErrorState } from "@/shared/components/common"
import { BookingDetailsSkeleton } from "@/features/booking/components/BookingPageSkeletons"
import { useTransportPlan } from "../hooks/useTransportPlans"
import { getTransportPlanError } from "../transport-plan.services"
import { transportPlanIdSchema, transportPlanTabSchema } from "../transport-plan.schemas"
import type { TransportPlanDetail } from "../transport-plan.types"
import { Button } from "@/shared/components/ui/button"
import { useAuthStore } from "@/features/auth/store"
import { canEditTransportPlan } from "../transport-plan.form"
import { editTransportPlanPath } from "../approved-booking-actions"
import EditTransportPlanPage from "./EditTransportPlanPage"
import { TransportPlanStatusBadge } from "../components/TransportPlanStatusBadge"
import { TransportPlanGeneral } from "../components/TransportPlanGeneral"
import { TransportPlanQuotation } from "../components/TransportPlanQuotation"
import { TransportPlanPersonnel, type PersonnelPanelProps } from "../components/TransportPlanPersonnel"
import { Flow3MockIndicator } from "../components/Flow3MockIndicator"

export function TransportPlanDetails({ plan, personnelPanel }: { plan: TransportPlanDetail; personnelPanel?: ComponentType<PersonnelPanelProps> }) {
  const [params, setParams] = useSearchParams()
  const principal = useAuthStore((state) => state.principal)
  const selected = transportPlanTabSchema.safeParse(params.get("tab") ?? "general")
  const activeTab = selected.success ? selected.data : "general"
  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
      <div className="space-y-2"><h2 className="font-heading text-2xl">{plan.planCode}</h2><p className="text-sm text-slate-500">Booking: {plan.booking.bookingCode}</p></div>
      <div className="flex flex-wrap items-center gap-3">
        <TransportPlanStatusBadge status={plan.status} />
        {canEditTransportPlan(principal, plan) ? <Button asChild variant="outline" className="rounded-[2px] bg-white"><Link to={editTransportPlanPath(plan.transportPlanId)}>Edit Transport Plan</Link></Button> : null}
      </div>
    </div>
    <Tabs.Root value={activeTab} onValueChange={(value) => setParams((current) => { const next = new URLSearchParams(current); next.set("tab", transportPlanTabSchema.parse(value)); return next })}>
      <Tabs.List aria-label="Transport plan sections" className="mb-5 flex flex-nowrap gap-5 overflow-x-auto border-b border-slate-200">
        {([{ value: "general", label: "General" }, { value: "quotation", label: "Quotation" }, { value: "personnel", label: "Personnel" }]).map((tab) =>
          <Tabs.Trigger key={tab.value} value={tab.value} className="shrink-0 whitespace-nowrap border-b-2 border-transparent px-0.5 py-2.5 font-heading text-sm uppercase text-slate-500 outline-none hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-amber-500/30 data-[state=active]:border-[#ef8f00] data-[state=active]:text-[#ef8f00]">{tab.label}</Tabs.Trigger>)}
      </Tabs.List>
      <Tabs.Content value="general" className="outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30"><TransportPlanGeneral plan={plan} /></Tabs.Content>
      <Tabs.Content value="quotation" className="outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30"><TransportPlanQuotation transportPlanId={plan.transportPlanId} /></Tabs.Content>
      <Tabs.Content value="personnel" className="outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30"><TransportPlanPersonnel transportPlanId={plan.transportPlanId} panel={personnelPanel} /></Tabs.Content>
    </Tabs.Root>
  </div>
}

function TransportPlanReadPage() {
  const { transportPlanId = "" } = useParams<{ transportPlanId: string }>()
  const validId = transportPlanIdSchema.safeParse(transportPlanId).success
  const query = useTransportPlan(transportPlanId)
  const error = query.isError ? getTransportPlanError(query.error) : null
  return <div className="booking-page-shell min-w-0 min-h-[calc(100svh-5rem)] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
    <div className="booking-page-enter mx-auto w-full min-w-0 max-w-[1152px] space-y-5">
      <Flow3MockIndicator />
      <div><PageHeader title="Transport Plan Details" backHref={ROLE_ROUTES.transportPlans} backLabel="Back to Transport Plans" /></div>
      {!validId ? <ErrorState message="The transport plan identifier is invalid." /> : error ? <ErrorState message={error.message} onRetry={error.retryable ? () => void query.refetch() : undefined} /> :
        query.isPending ? <BookingDetailsSkeleton /> : query.data ? <TransportPlanDetails key={transportPlanId} plan={query.data} /> : null}
    </div>
  </div>
}

export default function TransportPlanDetailsPage() {
  const [params] = useSearchParams()
  return params.get("action") === "edit" ? <EditTransportPlanPage /> : <TransportPlanReadPage />
}
