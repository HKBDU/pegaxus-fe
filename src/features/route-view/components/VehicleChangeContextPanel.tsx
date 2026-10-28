import { Button } from "@/shared/components/ui/button";
import { useVehicleChangeContext } from "../hooks/useVehicleChangeContext";
import { vehicleChangeDialogBlocker } from "../vehicle-change";
import type { RoutePlanDetail } from "../types";
import type { EmergencyContext } from "../hooks/useEmergencyRoute";

const stateLabels = {
  idle: "Vehicle replacement",
  loading: "Checking vehicle replacement",
  permission_denied: "Replacement access denied",
  invalid_incident: "Incident unavailable",
  cost_not_approved: "Replacement cost approval required",
  route_mismatch: "Route and incident do not match",
  no_active_route: "No active route",
  read_failure: "Unable to read replacement context",
  ready: "Replacement context verified",
};

export function VehicleChangeContextPanel({
  plan,
  context,
  incidentReportId,
  onDismiss,
}: {
  plan: RoutePlanDetail;
  context: EmergencyContext;
  incidentReportId: string;
  onDismiss: () => void;
}) {
  const state = useVehicleChangeContext(plan, context, incidentReportId);
  return (
    <section
      aria-label="Vehicle replacement"
      className="min-w-0 space-y-2 border border-border bg-background p-3 text-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 font-heading text-base uppercase">
          {stateLabels[state.kind]}
        </h2>
        <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
          Close replacement context
        </Button>
      </div>
      {state.kind !== "ready" && state.kind !== "idle" && (
        <p
          role={state.kind === "loading" ? "status" : "alert"}
          className="m-0 break-words text-muted-foreground"
        >
          {state.message}
        </p>
      )}
      {state.kind === "ready" && (
        <>
          <p className="m-0">
            {state.data.incident.incidentCode} · Replacement vehicle cost
            approved
          </p>
          <p role="status" className="m-0 text-muted-foreground">
            {state.data.selection.blocker}
          </p>
          <p className="m-0 text-muted-foreground">
            {vehicleChangeDialogBlocker}
          </p>
          <p className="m-0 text-xs">
            {state.data.selection.candidates.length} candidate segments ·{" "}
            {state.data.selection.excluded.length} excluded · 0 verified for
            submission
          </p>
          <ul className="m-0 list-none space-y-1 p-0 text-xs">
            {state.data.selection.candidates.map(
              ({ sourceRoutePlanCode, segment }) => (
                <li key={segment.routePlanRouteId} className="break-words">
                  Viewed in {sourceRoutePlanCode} · {segment.routeType} segment{" "}
                  {segment.sequenceNo}: {segment.fromLocation.locationName} →{" "}
                  {segment.toLocation.locationName} · Eligibility unavailable
                </li>
              ),
            )}
          </ul>
        </>
      )}
    </section>
  );
}
