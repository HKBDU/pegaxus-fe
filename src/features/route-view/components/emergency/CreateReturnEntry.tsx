import { useState } from "react"
import { Link } from "react-router-dom"
import { GitBranch } from "lucide-react"
import { returnRouteCreate } from "@/app/route-config"
import { getWorkspaceRole } from "@/features/transport-plan/workspace-role"
import { isFlow3MockMode } from "@/features/transport-plan/source"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import type { EmergencyContext } from "../../hooks/useEmergencyRoute"
import type { RoutePlanDetail } from "../../types"

export type ReturnBuilderAvailability =
  | { status: "ready" }
  | { status: "loading" }
  | { status: "unavailable"; message: string }
  | { status: "error"; message: string; retry?: () => void }

// The Return Builder is integrated (paginated lookups, Transport Plan mapping), so creation is open by default.
const currentBuilderAvailability: ReturnBuilderAvailability = { status: "ready" }

export function CreateReturnEntry({ plan, context, builderAvailability = currentBuilderAvailability }: { plan: RoutePlanDetail; context: EmergencyContext; builderAvailability?: ReturnBuilderAvailability }) {
  const [open, setOpen] = useState(false)
  const inScope = getWorkspaceRole(context.workspace.principal) === "coordinator" && context.workspace.transportStatus === "IN_TRANSIT" && plan.routeType === "PRIMARY"
  const blockedReason = isFlow3MockMode() ? "The existing Return Builder uses real APIs. Open it with real development data, not mock fixtures." : context.workspace.hasOpenReturn ? "A non-cancelled RETURN already exists." : context.workspace.planStatus !== "APPROVED" || plan.status !== "ACTIVE" ? "An approved transport plan and active PRIMARY are required." : context.workspace.dossierStatus !== "APPROVED" ? "An approved compliance dossier is required." : undefined
  if (!inScope) return null
  return <>
    <Button size="sm" variant="outline" disabled={Boolean(blockedReason)} title={blockedReason} onClick={() => setOpen(true)}><GitBranch aria-hidden="true" className="size-4" />Create Return</Button>
    {blockedReason ? <span className="max-w-60 text-xs text-slate-500">{blockedReason}</span> : null}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="flow3-ui rounded-[2px]"><DialogHeader><DialogTitle>Create Return Route</DialogTitle><DialogDescription>Continue to the existing Return Builder for this transport plan. The backend validates journey, Location and route rules when saving.</DialogDescription></DialogHeader>
      {blockedReason ? <p role="alert" className="text-sm text-destructive">{blockedReason}</p> : builderAvailability.status === "loading" ? <p role="status" className="text-sm">Loading Return Builder…</p> : builderAvailability.status === "error" || builderAvailability.status === "unavailable" ? <p role="alert" className="text-sm text-destructive">{builderAvailability.message}</p> : <p className="text-sm">Open the builder to select the return journey. Location resolution and segment validation remain in the existing builder.</p>}
      <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Close</Button>{builderAvailability.status === "error" && builderAvailability.retry && !blockedReason ? <Button variant="outline" onClick={builderAvailability.retry}>Try Again</Button> : null}{builderAvailability.status === "ready" && !blockedReason ? <Button asChild><Link to={returnRouteCreate(plan.transportPlanId)}>Open Return Builder</Link></Button> : null}</DialogFooter>
    </DialogContent></Dialog>
  </>
}
