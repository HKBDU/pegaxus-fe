import { Link } from "react-router-dom"
import { canAccess } from "@/features/auth/access-control"
import type { AuthPrincipal } from "@/features/auth/types"
import { transportPlanDetail, dossierDetail } from "@/app/route-config"
import { Button } from "@/shared/components/ui/button"
import { RoutePlansWorkspace } from "@/features/route-view/components/RoutePlansWorkspace"
import { getApprovedBookingActions } from "../approved-booking-actions"
import { formatPlanDate } from "../format"
import type { ApprovedBookingDetail } from "../types"
import { Section, Field } from "./ApprovedBookingDetails"
import { ApprovedBookingBadge } from "./ApprovedBookingBadge"

export function TransportWorkspace({ booking, principal, showPlanningReference = true }: { booking: ApprovedBookingDetail; principal: AuthPrincipal | null; showPlanningReference?: boolean }) {
  const manager = canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })
  const specialist = !manager && canAccess(principal, { anyRole: ["TRANSPORT_SPECIALIST"] })
  const plan = booking.transportPlan
  const legalActions = specialist ? getApprovedBookingActions(principal, booking).filter(action => ["applyDossierTemplate", "viewComplianceDossier", "viewDossierRequirements"].includes(action.kind)) : []
  return <div className="space-y-5">
    {showPlanningReference && (plan ? <Section title={manager ? "Planning Summary" : "Planning Reference"}>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Transport plan">{plan.planCode}</Field><Field label="Plan status"><ApprovedBookingBadge value={plan.status} /></Field>
        <Field label="Planned start">{formatPlanDate(plan.plannedStartAt)}</Field><Field label="Planned end">{formatPlanDate(plan.plannedEndAt)}</Field>
        <Field label="Estimated distance">{plan.estimatedDistanceKm == null ? "—" : `${plan.estimatedDistanceKm} km`}</Field>
        <Field label="Estimated duration">{plan.estimatedDurationMinutes == null ? "—" : `${plan.estimatedDurationMinutes} minutes`}</Field>
      </dl>
      <dl className="border-t pt-3"><Field label="Planning note">{plan.planningNote}</Field></dl>
      {manager && <div className="space-y-3 border-t pt-3">
        <h3 className="font-heading text-base uppercase">Quotation &amp; Payment</h3>
        <p className="text-xs text-slate-500">After plan creation, quotation acceptance and deposit are handled in Flow 6 before Phase 1 assignment.</p>
        <div className="flex flex-wrap gap-2"><Button asChild variant="outline" size="sm" className="rounded-md"><Link to={`${transportPlanDetail(plan.transportPlanId)}?tab=quotation`}>View Quotation &amp; Payment</Link></Button>
          {booking.complianceDossier && <Button asChild variant="outline" size="sm" className="rounded-md"><Link to={dossierDetail(booking.complianceDossier.complianceDossierId, "LOGISTICS_MANAGER")}>View Compliance Dossier</Link></Button>}
        </div>
      </div>}
    </Section> : <Section title="Planning Summary"><p className="text-sm text-slate-500">No transport plan has been created. A Logistics Manager must create the plan before route planning and legal preparation.</p></Section>)}
    {specialist && <Section title="Legal Preparation">
      <p className="text-xs text-slate-500">Prepare the dossier and requirements through the existing Flow 2 workspace. Customer document uploads remain customer-only.</p>
      <div className="flex flex-wrap gap-3">{legalActions.map(action => action.href ?
        <Button key={action.kind} asChild variant="outline" size="sm" className="rounded-md"><Link to={action.href}>{action.label}</Link></Button> :
        <div key={action.kind} className="space-y-1"><Button disabled title={action.blockedReason} variant="outline" size="sm" className="rounded-md">{action.label}</Button><p className="max-w-sm text-[11px] text-slate-500">{action.blockedReason}</p></div>)}</div>
      {booking.complianceDossier && <p className="text-xs text-slate-500">Open the dossier to view and manage its requirements using the existing Requirements tab.</p>}
      {!legalActions.length && <p className="text-xs text-slate-500">Legal preparation requires an approved plan, Phase 1 assignment and an available transport.</p>}
    </Section>}
    {plan && <RoutePlansWorkspace transportPlanId={plan.transportPlanId} planStatus={plan.status} transportStatus={booking.transport?.status} principal={principal} />}
  </div>
}
