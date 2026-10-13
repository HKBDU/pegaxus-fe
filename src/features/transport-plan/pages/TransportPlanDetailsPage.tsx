import "../ui.css"
import type { ComponentType } from "react"
import { Tabs } from "radix-ui"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { invoiceCreate, ROLE_ROUTES } from "@/app/route-config"
import { PageHeader } from "@/shared/components/PageHeader"
import { ErrorState } from "@/shared/components/common"
import { BookingDetailsSkeleton } from "@/features/booking/components/BookingPageSkeletons"
import { useTransportPlan } from "../hooks/useTransportPlans"
import { getTransportPlanError } from "../services"
import { actionEntityIdSchema, transportPlanTabSchema } from "../schemas"
import type { TransportPlanDetail } from "../types"
import { Button } from "@/shared/components/ui/button"
import { useAuthStore } from "@/features/auth/store"
import { UsersRound } from "lucide-react"
import { canEditTransportPlan } from "../transport-plan.form"
import { editTransportPlanPath, getManagePersonnelAction } from "../approved-booking-actions"
import EditTransportPlanPage from "./EditTransportPlanPage"
import { TransportPlanStatusBadge } from "../components/TransportPlanStatusBadge"
import { TransportPlanGeneral } from "../components/TransportPlanGeneral"
import { TransportPlanQuotation } from "../components/TransportPlanQuotation"
import { TransportPlanPersonnel, type PersonnelPanelProps } from "../components/TransportPlanPersonnel"
import { Flow3MockIndicator } from "../components/Flow3MockIndicator"
import { TransportPlanWorkspace } from "../components/TransportPlanWorkspace"
import { TransportOverview } from "../components/TransportOverview"
import { getWorkspaceRole } from "../workspace-role"
import { workspaceLabels } from "../constants"
import { useApprovedBooking } from "../hooks/useApprovedBookings"
import { getApprovedBookingError } from "../services"
import { PersonnelAssignmentPanel } from "@/features/personnel"
import { InvoicesPanel } from "@/features/invoice"

export function TransportPlanDetails({ plan, personnelPanel }: { plan: TransportPlanDetail; personnelPanel?: ComponentType<PersonnelPanelProps> }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const principal = useAuthStore((state) => state.principal)
  const manager = getWorkspaceRole(principal) === "manager"
  const personnelAction = getManagePersonnelAction(principal, plan)
  const selected = transportPlanTabSchema.safeParse(params.get("tab") ?? "general")
  const activeTab = manager && selected.success ? selected.data : "general"
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-slate-200 border-l-2 border-l-primary bg-white p-3 shadow-xs">
      <div className="min-w-0 space-y-1"><h2 className="m-0! break-words font-heading text-xl! leading-6!">{plan.planCode}</h2><p className="break-words text-xs text-slate-500">Booking: {plan.booking.bookingCode}</p></div>
      <div className="flex flex-wrap items-center gap-3">
        <TransportPlanStatusBadge status={plan.status} />
        {personnelAction?.href ? <Button asChild className="rounded-[2px]"><Link to={personnelAction.href}><UsersRound aria-hidden="true" className="size-4" />Manage Personnel</Link></Button> : null}
        {canEditTransportPlan(principal, plan) ? <Button asChild variant="outline" className="rounded-[2px] bg-white"><Link to={editTransportPlanPath(plan.transportPlanId)}>Edit Transport Plan</Link></Button> : null}
        {manager ? <Button className="rounded-[2px]" onClick={() => navigate(invoiceCreate(plan.booking.bookingId))}>Create Invoice</Button> : null}
      </div>
    </div>
    <TransportOverview journey={plan.booking} customerName={plan.booking.customerName} plannedStartAt={plan.plannedStartAt} transportStatus={plan.transport.status} />
    {manager && ["DRAFT", "PENDING"].includes(plan.status) ?
      <p className="text-xs text-slate-500">Phase 1 assignment requires a customer-approved TransportPlan after quotation acceptance and deposit in Flow 6.</p> : null}
    {manager ? <><TransportPlanQuotation transportPlanId={plan.transportPlanId} canManage />
    <Tabs.Root value={activeTab} onValueChange={(value) => setParams((current) => { const next = new URLSearchParams(current); next.set("tab", transportPlanTabSchema.parse(value)); return next })}>
      <Tabs.List aria-label="Transport plan sections" className="mb-3 flex flex-wrap gap-1 p-1 border-b border-slate-200">
        {([{ value: "general", label: "General" }, { value: "personnel", label: "Personnel" }, { value: "invoices", label: "Invoices" }]).map((tab) =>
          <Tabs.Trigger key={tab.value} value={tab.value} className="shrink-0 whitespace-nowrap rounded-t-[2px] border-b-2 border-transparent px-4 py-2.5 font-heading text-sm uppercase text-slate-500 outline-none transition-colors duration-200 hover:bg-primary/5 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-primary/30 data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-slate-900 motion-reduce:transition-none">{tab.label}</Tabs.Trigger>)}
      </Tabs.List>
      <Tabs.Content value="general" className="space-y-4 outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30"><TransportPlanGeneral plan={plan} /><TransportPlanWorkspace plan={plan} /></Tabs.Content>
      <Tabs.Content value="personnel" className="outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30">{personnelAction ? <TransportPlanPersonnel transportPlanId={plan.transportPlanId} panel={personnelPanel} /> : <p className="text-sm text-slate-500">Personnel assignment opens after the transport plan is approved.</p>}</Tabs.Content>
      <Tabs.Content value="invoices" className="outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30">{activeTab === "invoices" ? <InvoicesPanel bookingId={plan.booking.bookingId} /> : null}</Tabs.Content>
    </Tabs.Root>
    </> : <TransportPlanWorkspace plan={plan} />}
  </div>
}

function TransportPlanReadPage() {
  const { transportPlanId = "" } = useParams<{ transportPlanId: string }>()
  const validId = actionEntityIdSchema.safeParse(transportPlanId).success
  const query = useTransportPlan(transportPlanId)
  const principal = useAuthStore(state => state.principal)
  const role = getWorkspaceRole(principal)
  const staff = ["coordinator", "specialist"].includes(getWorkspaceRole(principal) ?? "")
  // TP3 and AB2 must both authorize staff before rendering the shared UC-32 workspace.
  const access = useApprovedBooking(query.data?.booking.bookingId ?? "", staff && Boolean(query.data) && !query.isError)
  const accessError = staff && access.isError ? getApprovedBookingError(access.error) : null
  const error = query.isError ? getTransportPlanError(query.error) : null
  return <div className="flow3-ui booking-page-shell min-w-0 min-h-[calc(100svh-5rem)] px-4 py-4 font-sans sm:px-6 lg:py-6">
    <div className="mx-auto w-full min-w-0 max-w-[1152px] space-y-4">
      <Flow3MockIndicator />
      <div><PageHeader className="[&_h1]:text-2xl [&_h1]:leading-tight sm:[&_h1]:text-3xl" title="Transport Plan Details" backHref={role === "manager" ? ROLE_ROUTES.transportPlans : ROLE_ROUTES.approvedBookings} backLabel={role === "manager" ? "Back to Transport Plans" : `Back to ${role ? workspaceLabels[role].list : "Transports"}`} /></div>
      {!validId ? <ErrorState message="The transport plan identifier is invalid." /> : error ? <ErrorState message={error.message} onRetry={error.retryable ? () => void query.refetch() : undefined} /> :
        query.isPending || (staff && access.isPending) ? <BookingDetailsSkeleton /> : accessError ? <ErrorState message={accessError.message} onRetry={accessError.retryable ? () => void access.refetch() : undefined} /> : query.data ? <TransportPlanDetails key={transportPlanId} plan={query.data} personnelPanel={PersonnelAssignmentPanel} /> : null}
    </div>
  </div>
}

export default function TransportPlanDetailsPage() {
  const [params] = useSearchParams()
  return params.get("action") === "edit" ? <EditTransportPlanPage /> : <TransportPlanReadPage />
}
