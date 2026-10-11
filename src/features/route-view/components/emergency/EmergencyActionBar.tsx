import { ShieldAlert } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { getWorkspaceRole } from "@/features/transport-plan/workspace-role"
import { emergencyActionLabels, getEmergencyActions } from "../../emergency-policy"
import type { EmergencyContext } from "../../hooks/useEmergencyRoute"
import type { EmergencyAction, RoutePlanDetail } from "../../types"

export function EmergencyActionBar({ plan, context, onAction }: { plan: RoutePlanDetail; context: EmergencyContext; onAction: (action: EmergencyAction) => void }) {
  if (context.workspace.transportStatus !== "IN_TRANSIT") return null
  const actions = getEmergencyActions(plan, context.workspace)
  const coordinator = getWorkspaceRole(context.workspace.principal) === "coordinator"
  return <section aria-label="Emergency operations" className="min-w-0 rounded-md border border-l-4 border-slate-200 border-l-primary bg-white p-4">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1 space-y-2"><h2 className="flex items-center gap-2 font-heading text-lg uppercase"><ShieldAlert aria-hidden="true" className="size-4 text-primary" />Emergency Operations</h2>
        <p className="break-words text-xs text-slate-600">{context.transportCode} · IN TRANSIT · Selected: {plan.routePlanCode} ({plan.routeType}, {plan.status})</p>
        <p className="break-words text-xs text-slate-500">Active routes: {context.activeRoutes.map(route => `${route.routePlanCode} (${route.routeType})`).join(" · ") || "Not available"}. The backend determines the effective journey.</p>
      </div>
      <div className="flex w-full flex-wrap gap-2 sm:w-auto">{actions.map(action => <Button key={action} id={`emergency-${action}-${plan.routePlanId}`} size="sm" onClick={() => onAction(action)}>{emergencyActionLabels[action]}</Button>)}</div>
    </div>
    {coordinator && plan.routeType === "PRIMARY" && <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3"><Button variant="outline" size="sm" disabled title="RETURN creation requires the route builder's public entry point.">Create Return — integration pending</Button><p className="max-w-md text-xs text-slate-500">RETURN creation belongs to the route builder. A draft RETURN is reviewed by Logistics Manager before TS prepares documents.</p></div>}
    {!actions.length && <p className="mt-3 text-xs text-slate-500">{plan.routeType === "RETURN" && plan.status === "DRAFT" && context.workspace.dossierStatus === "DRAFT" ? "The dossier has been reopened. Await TS document preparation and RP7 legal confirmation; RETURN is not activated." : "No UC-48 action is available for your role and this route state. Legal review remains in the Transport Specialist's route workflow."}</p>}
  </section>
}
