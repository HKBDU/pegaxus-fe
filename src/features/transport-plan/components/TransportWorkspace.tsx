import { Link } from "react-router-dom"
import type { AuthPrincipal } from "@/features/auth/types"
import { dossierDetail } from "@/app/route-config"
import { Button } from "@/shared/components/ui/button"
import { RoutePlansWorkspace } from "@/features/route-view/components/RoutePlansWorkspace"
import { getApprovedBookingActions } from "../approved-booking-actions"
import { formatPlanDate } from "../format"
import type { ApprovedBookingDetail } from "../types"
import { Section, Field } from "./ApprovedBookingDetails"
import { ApprovedBookingBadge } from "./ApprovedBookingBadge"
import { TransportPlanQuotation } from "./TransportPlanQuotation"
import { getWorkspaceRole, workspaceLabels } from "../workspace-role"

export function TransportWorkspace({ booking, principal, showPlanningReference = true }: { booking: ApprovedBookingDetail; principal: AuthPrincipal | null; showPlanningReference?: boolean }) {
  const role = getWorkspaceRole(principal)
  const manager = role === "manager", specialist = role === "specialist"
  const plan = booking.transportPlan
  const managerActions = manager ? getApprovedBookingActions(principal, booking) : []
  const legalActions = specialist ? getApprovedBookingActions(principal, booking).filter(action => ["applyDossierTemplate", "viewComplianceDossier", "viewDossierRequirements"].includes(action.kind)) : []
  if (!role) return null
  return <section aria-label={workspaceLabels[role].workspace} className="min-w-0 space-y-5">
    <h2 className="font-heading text-xl uppercase tracking-wide">{workspaceLabels[role].workspace}</h2>
    {showPlanningReference && (plan ? <Section title={manager ? "Planning Summary" : "Planning Reference"}>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Transport plan">{plan.planCode}</Field><Field label="Plan status"><ApprovedBookingBadge value={plan.status} /></Field>
        <Field label="Planned start">{formatPlanDate(plan.plannedStartAt)}</Field><Field label="Planned end">{formatPlanDate(plan.plannedEndAt)}</Field>
        <Field label="Estimated distance">{plan.estimatedDistanceKm == null ? "—" : `${plan.estimatedDistanceKm} km`}</Field>
        <Field label="Estimated duration">{plan.estimatedDurationMinutes == null ? "—" : `${plan.estimatedDurationMinutes} minutes`}</Field>
      </dl>
      <dl className="border-t pt-3"><Field label="Planning note">{plan.planningNote}</Field></dl>
      {manager && <div className="space-y-3 border-t pt-3">
        <div className="flex flex-wrap gap-2">{managerActions.filter(action => action.href).map(action => <Button key={action.kind} asChild variant="outline" size="sm" className="rounded-md"><Link to={action.href!}>{action.label}</Link></Button>)}</div>
      </div>}
    </Section> : <Section title="Planning Summary"><p className="text-sm text-slate-500">No transport plan has been created. A Logistics Manager must create the plan before route planning and legal preparation.</p></Section>)}
    {manager && plan && showPlanningReference && <TransportPlanQuotation transportPlanId={plan.transportPlanId} canManage />}
    {manager && <Section title="Compliance Monitoring"><div className="flex flex-wrap items-center justify-between gap-3">
      {booking.complianceDossier ? <><ApprovedBookingBadge value={booking.complianceDossier.status} /><Button asChild variant="outline" size="sm" className="rounded-md"><Link to={dossierDetail(booking.complianceDossier.complianceDossierId, "LOGISTICS_MANAGER")}>View Compliance Dossier</Link></Button></> : <p className="text-sm text-slate-500">No compliance dossier has been prepared yet.</p>}
    </div></Section>}
    {specialist && <Section title="Legal Preparation">
      <p className="text-xs text-slate-500">Prepare the dossier and requirements through the existing Flow 2 workspace. Customer document uploads remain customer-only.</p>
      <div className="flex flex-wrap gap-3">{legalActions.map(action => action.href ?
        <Button key={action.kind} asChild variant="outline" size="sm" className="rounded-md"><Link to={action.href}>{action.label}</Link></Button> :
        <div key={action.kind} className="space-y-1"><Button disabled title={action.blockedReason} variant="outline" size="sm" className="rounded-md">{action.label}</Button><p className="max-w-sm text-[11px] text-slate-500">{action.blockedReason}</p></div>)}</div>
      {booking.complianceDossier && <p className="text-xs text-slate-500">Open the dossier to view and manage its requirements using the existing Requirements tab.</p>}
      {!legalActions.length && <p className="text-xs text-slate-500">Legal preparation requires an approved plan, Phase 1 assignment and an available transport.</p>}
    </Section>}
    {plan && <RoutePlansWorkspace transportPlanId={plan.transportPlanId} planStatus={plan.status} transportStatus={booking.transport?.status} dossierStatus={booking.complianceDossier?.status} principal={principal} />}
  </section>
}
