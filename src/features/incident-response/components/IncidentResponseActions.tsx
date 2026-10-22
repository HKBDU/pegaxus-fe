import { Link } from "react-router-dom";
import { Coins, Route } from "lucide-react";
import { canAccess } from "@/features/auth/access-control";
import { Button } from "@/shared/components/ui/button";
import type { IncidentAudience } from "@/shared/types/incident";
import { useEmergencyCostScope } from "../hooks/useEmergencyCostScope";
import { emergencyCostCreatePath, emergencyReroutePath } from "../navigation";
import {
  emergencyCostIdSchema,
  emergencyCostIncidentSchema,
  type EmergencyCostIncident,
} from "../schemas";
import { canCreateEmergencyCosts, canReadEmergencyCosts } from "../services";

export interface IncidentResponseActionsProps {
  incident: EmergencyCostIncident;
  audience?: IncidentAudience;
}

export function IncidentResponseActions({
  incident,
  audience,
}: IncidentResponseActionsProps) {
  const { principal, signedIn } = useEmergencyCostScope();
  if (audience === "CUSTOMER" || !signedIn || !canReadEmergencyCosts(principal))
    return null;
  const parsed = emergencyCostIncidentSchema.safeParse(incident);
  if (
    !parsed.success ||
    !emergencyCostIdSchema.safeParse(parsed.data.incidentReportId).success
  )
    return null;
  const context = parsed.data;
  if (
    !["REPORTED", "PENDING"].includes(context.status) ||
    context.transport.status !== "IN_TRANSIT"
  )
    return null;
  const has = (action: string) => context.availableActions.includes(action);
  const manager = canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] });
  const coordinator =
    !manager && canAccess(principal, { anyRole: ["FLEET_ROUTE_COORDINATOR"] });
  const create = canCreateEmergencyCosts(principal) && has("REQUEST_COST");
  const reroute =
    (manager && has("HOLD_ROUTE")) ||
    (coordinator && (has("PROPOSE_REROUTE") || has("ESCALATE_REROUTE")));
  if (!create && !reroute) return null;
  return (
    <div
      role="group"
      aria-label="Incident response actions"
      className="flex min-w-0 flex-wrap gap-2"
    >
      {create && (
        <Button asChild className="min-h-11 rounded-[2px] sm:min-h-9">
          <Link
            to={emergencyCostCreatePath(
              coordinator ? "admin" : "crew",
              context.incidentReportId,
            )}
          >
            <Coins aria-hidden="true" className="size-4" />
            Request emergency cost
          </Link>
        </Button>
      )}
      {reroute && (
        <Button
          asChild
          variant="outline"
          className="min-h-11 rounded-[2px] sm:min-h-9"
        >
          <Link to={emergencyReroutePath(context.incidentReportId)}>
            <Route aria-hidden="true" className="size-4" />
            {manager ? "Review Hold & Wait" : "Review emergency routes"}
          </Link>
        </Button>
      )}
    </div>
  );
}
