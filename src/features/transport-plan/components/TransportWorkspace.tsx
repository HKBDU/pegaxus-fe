import { Link } from "react-router-dom"
import { Compass, ShieldCheck } from "lucide-react"
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
  const manager = role === "manager", specialist = role === "specialist", coordinator = role === "coordinator"
  const plan = booking.transportPlan
  const managerActions = manager ? getApprovedBookingActions(principal, booking) : []
  const legalActions = specialist ? getApprovedBookingActions(principal, booking).filter(action => ["applyDossierTemplate", "viewComplianceDossier", "viewDossierRequirements"].includes(action.kind)) : []
  if (!role) return null
  const planningReference = showPlanningReference && (plan ? <Section title={manager ? "Planning Summary" : "Planning Reference"}>
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
    </Section> : <Section title="Planning Summary"><p className="text-sm text-slate-500">No transport plan has been created. A Logistics Manager must create the plan before route planning and legal preparation.</p></Section>)
  return <section aria-label={workspaceLabels[role].workspace} className="min-w-0 space-y-5">
    <div className="flex items-start gap-3 pt-2"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white"><Compass aria-hidden="true" className="size-5" /></span>
      <div><h2 className="font-heading text-xl uppercase tracking-wide text-slate-900">{workspaceLabels[role].workspace}</h2><p className="mt-1 text-xs text-slate-500">{coordinator ? "Coordinate routes, review alternatives and manage changes during transit." : manager ? "Monitor compliance, route readiness and operational decisions." : "Prepare compliance and review route legal feasibility."}</p></div>
    </div>
    {!coordinator && planningReference}
    {manager && plan && showPlanningReference && <TransportPlanQuotation transportPlanId={plan.transportPlanId} canManage />}
    {manager && <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-center gap-3"><ShieldCheck aria-hidden="true" className="size-5 text-slate-500" /><div><h3 className="font-heading text-base uppercase">Compliance Monitoring</h3>{!booking.complianceDossier && <p className="mt-1 text-xs text-slate-500">No compliance dossier has been prepared yet.</p>}</div></div>
      {booking.complianceDossier && <div className="flex flex-wrap items-center gap-3"><ApprovedBookingBadge value={booking.complianceDossier.status} /><Button asChild variant="outline" size="sm" className="rounded-md"><Link to={dossierDetail(booking.complianceDossier.complianceDossierId, "LOGISTICS_MANAGER")}>View Compliance Dossier</Link></Button></div>}
    </div>}
    {specialist && <Section title="Legal Preparation">
      <p className="text-xs text-slate-500">Prepare the dossier and requirements through the existing Flow 2 workspace. Customer document uploads remain customer-only.</p>
      <div className="flex flex-wrap gap-3">{legalActions.map(action => action.href ?
        <Button key={action.kind} asChild variant="outline" size="sm" className="rounded-md"><Link to={action.href}>{action.label}</Link></Button> :
        <div key={action.kind} className="space-y-1"><Button disabled title={action.blockedReason} variant="outline" size="sm" className="rounded-md">{action.label}</Button><p className="max-w-sm text-[11px] text-slate-500">{action.blockedReason}</p></div>)}</div>
      {booking.complianceDossier && <p className="text-xs text-slate-500">Open the dossier to view and manage its requirements using the existing Requirements tab.</p>}
      {!legalActions.length && <p className="text-xs text-slate-500">Legal preparation requires an approved plan, Phase 1 assignment and an available transport.</p>}
    </Section>}
    {plan && <RoutePlansWorkspace transportPlanId={plan.transportPlanId} planStatus={plan.status} transportStatus={booking.transport?.status} dossierStatus={booking.complianceDossier?.status} principal={principal} />}
    {coordinator && planningReference && <details className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><summary className="cursor-pointer font-heading text-sm uppercase text-slate-600">Planning Reference{plan ? ` · ${plan.planCode}` : ""}</summary><div className="mt-4">{planningReference}</div></details>}
  </section>
}
