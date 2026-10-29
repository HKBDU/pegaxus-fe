import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Coins, Loader2, Route, Truck } from "lucide-react";
import { canAccess } from "@/features/auth/access-control";
import { useAuthStore } from "@/features/auth/store";
import { routePlanDetail } from "@/app/route-config";
import {
  getRouteViewError,
  routeViewService,
} from "@/features/route-view/services";
import { Button } from "@/shared/components/ui/button";
import type { IncidentAudience } from "@/shared/types/incident";
import { useEmergencyCostScope } from "../hooks/useEmergencyCostScope";
import { useEmergencyCostRequests } from "../hooks/useEmergencyCostRequests";
import { emergencyCostCreatePath, emergencyReroutePath } from "../navigation";
import {
  emergencyCostIdSchema,
  emergencyCostIncidentSchema,
  type EmergencyCostIncident,
} from "../schemas";
import {
  canCreateEmergencyCosts,
  canReadEmergencyCosts,
  emergencyCostAuthScope,
  emergencyCostService,
  getEmergencyCostError,
} from "../services";
import { getRerouteContext, getRerouteError } from "../reroute-services";

export interface IncidentResponseActionsProps {
  incident: EmergencyCostIncident;
  audience?: IncidentAudience;
}

const sameId = (left: string, right: string) =>
  left.toLowerCase() === right.toLowerCase();

type VehicleIncident = EmergencyCostIncident & {
  vehicleDetail: NonNullable<EmergencyCostIncident["vehicleDetail"]>;
};

const hasVehicleIncident = (
  incident: EmergencyCostIncident,
): incident is VehicleIncident =>
  ["VEHICLE", "BOTH"].includes(incident.category) &&
  Boolean(incident.vehicleDetail);

class VehicleReplacementContextError extends Error {}

function VehicleReplacementAction({ incident }: { incident: VehicleIncident }) {
  const navigate = useNavigate();
  const { scope, source } = useEmergencyCostScope();
  const request = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filters = {
    incidentReportId: incident.incidentReportId,
    transportId: incident.transport.transportId,
    category: "REPLACEMENT_VEHICLE" as const,
    status: "APPROVED",
    pageIndex: 1,
    pageSize: 1,
  };
  const costs = useEmergencyCostRequests(filters);
  const hasApproval = (items: NonNullable<typeof costs.data>["items"]) =>
    items.some(
      (cost) =>
        cost.category === "REPLACEMENT_VEHICLE" &&
        cost.status === "APPROVED" &&
        sameId(cost.incident.incidentReportId, incident.incidentReportId) &&
        sameId(cost.incident.transportId, incident.transport.transportId),
    );

  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe(() => {
      if (emergencyCostAuthScope() !== scope) request.current?.abort();
    });
    return () => {
      unsubscribe();
      request.current?.abort();
      request.current = null;
    };
  }, [
    scope,
    source,
    incident.incidentReportId,
    incident.transport.transportId,
  ]);

  async function openRoute() {
    if (
      request.current ||
      costs.isFetching ||
      !costs.data ||
      !hasApproval(costs.data.items)
    )
      return;
    const flight = new AbortController();
    request.current = flight;
    setLoading(true);
    setError(null);
    let stage: "incident" | "reroute" | "route" = "incident";
    const ensureCurrent = () => {
      flight.signal.throwIfAborted();
      const auth = useAuthStore.getState();
      if (
        emergencyCostAuthScope() !== scope ||
        !auth.accessToken ||
        !canReadEmergencyCosts(auth.principal) ||
        !canAccess(auth.principal, { anyRole: ["FLEET_ROUTE_COORDINATOR"] }) ||
        canAccess(auth.principal, { anyRole: ["LOGISTICS_MANAGER"] })
      )
        throw new VehicleReplacementContextError(
          "Your session changed. Reopen the incident before continuing.",
        );
    };
    try {
      ensureCurrent();
      // Route View reads live data; never combine it with a simulated incident.
      if (source !== "real")
        throw new VehicleReplacementContextError(
          "Vehicle replacement navigation requires live incident and route data.",
        );
      const [latest, approved] = await Promise.all([
        emergencyCostService.getIncidentContext(
          incident.incidentReportId,
          flight.signal,
          scope,
        ),
        costs.refetch({ throwOnError: true }),
      ]);
      ensureCurrent();
      if (
        !sameId(latest.transport.transportId, incident.transport.transportId) ||
        !["REPORTED", "PENDING"].includes(latest.status) ||
        latest.transport.status !== "IN_TRANSIT" ||
        !hasVehicleIncident(latest) ||
        !sameId(
          latest.vehicleDetail.vehicle.vehicleId,
          incident.vehicleDetail.vehicle.vehicleId,
        )
      )
        throw new VehicleReplacementContextError(
          "The incident or transport changed. Review the latest incident before replacing vehicles.",
        );
      if (!approved.data || !hasApproval(approved.data.items))
        throw new VehicleReplacementContextError(
          "Waiting for replacement vehicle cost approval",
        );
      stage = "reroute";
      const context = await getRerouteContext(
        incident.incidentReportId,
        scope,
        flight.signal,
      );
      ensureCurrent();
      const transportPlanId = context.transport.transportPlanId;
      if (
        !transportPlanId ||
        !sameId(context.transport.transportId, latest.transport.transportId) ||
        context.transport.status !== "IN_TRANSIT" ||
        !["REPORTED", "PENDING"].includes(context.incident.status) ||
        context.incident.category !== latest.category
      )
        throw new VehicleReplacementContextError(
          "The active transport plan could not be verified. Reopen the incident and try again.",
        );
      stage = "route";
      const routes = await routeViewService.getRoutes(
        transportPlanId,
        { status: "ACTIVE" },
        flight.signal,
      );
      ensureCurrent();
      const active = routes.items.filter((plan) => plan.status === "ACTIVE");
      if (active.length !== 1)
        throw new VehicleReplacementContextError(
          active.length === 0
            ? "No ACTIVE route plan is available for this transport plan."
            : "Multiple ACTIVE route plans exist. Ask the route coordinator to resolve the active route before continuing.",
        );
      const plan = await routeViewService.getRoute(
        active[0].routePlanId,
        flight.signal,
      );
      ensureCurrent();
      if (
        plan.status !== "ACTIVE" ||
        !sameId(plan.transportPlanId, transportPlanId)
      )
        throw new VehicleReplacementContextError(
          "The route changed or belongs to another transport plan. Reopen the incident before continuing.",
        );
      navigate(
        `${routePlanDetail(plan.routePlanId)}?${new URLSearchParams({ changeVehicle: latest.incidentReportId })}`,
      );
    } catch (cause) {
      if (
        !flight.signal.aborted &&
        emergencyCostAuthScope() === scope &&
        request.current === flight
      )
        setError(
          cause instanceof VehicleReplacementContextError
            ? cause.message
            : stage === "route"
              ? getRouteViewError(cause).message
              : stage === "reroute"
                ? getRerouteError(cause).message
                : getEmergencyCostError(cause, "context").message,
        );
    } finally {
      if (request.current === flight) {
        request.current = null;
        if (!flight.signal.aborted && emergencyCostAuthScope() === scope)
          setLoading(false);
      }
      flight.abort();
    }
  }

  const approved =
    !costs.isError &&
    !costs.validationError &&
    costs.data &&
    hasApproval(costs.data.items);
  const approvalError = costs.validationError
    ? "The incident identifiers could not be verified for the replacement cost lookup."
    : costs.isError
      ? getEmergencyCostError(costs.error, "list").message
      : null;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {approved && (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 rounded-[2px] sm:min-h-9"
          disabled={loading || costs.isFetching}
          onClick={() => void openRoute()}
        >
          {loading ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Truck aria-hidden="true" className="size-4" />
          )}
          {loading ? "Checking active route…" : "Change Vehicles"}
        </Button>
      )}
      {!approved && !approvalError && (
        <span role="status" className="text-xs text-muted-foreground">
          {costs.isPending || costs.isFetching
            ? "Checking replacement cost approval…"
            : "Waiting for replacement vehicle cost approval"}
        </span>
      )}
      {(error || approvalError) && (
        <span role="alert" className="text-xs text-destructive">
          {error ?? approvalError}
        </span>
      )}
    </div>
  );
}

export function IncidentResponseActions({
  incident,
  audience,
}: IncidentResponseActionsProps) {
  const { principal, signedIn, scope, source } = useEmergencyCostScope();
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
  const replacement = coordinator && hasVehicleIncident(context);
  if (!create && !reroute && !replacement) return null;
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
      {replacement && (
        <VehicleReplacementAction
          key={`${scope}:${source}:${context.incidentReportId}:${context.transport.transportId}:${context.vehicleDetail.vehicle.vehicleId}`}
          incident={context}
        />
      )}
    </div>
  );
}
