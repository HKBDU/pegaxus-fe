import { ArrowUpRight, BellRing, GitBranch, Play, ShieldCheck } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { ApprovedBookingBadge } from "@/features/transport-plan/components/ApprovedBookingBadge"
import { getWorkspaceRole } from "@/features/transport-plan/workspace-role"
import { emergencyActionLabels, getEmergencyActions } from "../../emergency-policy"
import type { EmergencyContext } from "../../hooks/useEmergencyRoute"
import type { EmergencyAction, RoutePlanDetail } from "../../types"

export function EmergencyActionBar({ plan, context, onAction }: { plan: RoutePlanDetail; context: EmergencyContext; onAction: (action: EmergencyAction) => void }) {
  if (context.workspace.transportStatus !== "IN_TRANSIT") return null
  const actions = getEmergencyActions(plan, context.workspace)
  const coordinator = getWorkspaceRole(context.workspace.principal) === "coordinator"
  const icons = { request: ArrowUpRight, decision: ShieldCheck, activation: Play, notice: BellRing }
  return <section aria-label="Emergency operations" className="flex min-w-0 flex-wrap items-center justify-between gap-3">
    <div className="min-w-0 space-y-1.5"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold text-slate-700">{context.transportCode}</p><ApprovedBookingBadge value="IN_TRANSIT" /></div>
      <p className="text-xs text-slate-500">{coordinator ? "Route coordination" : getWorkspaceRole(context.workspace.principal) === "manager" ? "Management decisions" : "Route monitoring"}{plan.routeType === "RETURN" && plan.status === "DRAFT" && context.workspace.dossierStatus === "DRAFT" ? " · Awaiting document preparation and legal confirmation" : ""}</p>
    </div>
    <div className="flex flex-wrap gap-2">{actions.map(action => { const Icon = icons[action]; return <Button key={action} id={`emergency-${action}-${plan.routePlanId}`} className="rounded-lg" size="sm" onClick={() => onAction(action)}><Icon aria-hidden="true" className="size-4" />{emergencyActionLabels[action]}</Button> })}
      {coordinator && plan.routeType === "PRIMARY" && <Button variant="outline" size="sm" disabled title="Return route creation is not available yet." className="rounded-lg"><GitBranch aria-hidden="true" className="size-4" />Create Return</Button>}
    </div>
  </section>
}
