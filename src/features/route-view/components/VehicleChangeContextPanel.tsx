import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChangeVehiclesDialog,
  type ChangeVehiclesSnapshot,
} from "@/features/route-plan/components/ChangeVehiclesDialog";
import { Button } from "@/shared/components/ui/button";
import { useVehicleChangeContext } from "../hooks/useVehicleChangeContext";
import type { RoutePlanDetail } from "../types";
import {
  captureVehicleChangeRefresh,
  type EmergencyContext,
} from "../hooks/useEmergencyRoute";

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
  onReloadWorkspace,
  readOnly = false,
}: {
  plan: RoutePlanDetail;
  context: EmergencyContext;
  incidentReportId: string;
  onDismiss: () => void;
  onReloadWorkspace: () => Promise<unknown>;
  readOnly?: boolean;
}) {
  const state = useVehicleChangeContext(plan, context, incidentReportId);
  const client = useQueryClient();
  const opened = useRef<string | null>(null);
  const refresh = useRef<((result: unknown) => void) | null>(null);
  const [dialog, setDialog] = useState<{
    route: RoutePlanDetail;
    segments: RoutePlanDetail["segments"];
  } | null>(null);
  const key = `${plan.routePlanId}:${incidentReportId}`;
  useEffect(() => {
    if (readOnly || state.kind !== "ready" || state.refreshing || opened.current === key)
      return;
    const segments = state.data.selection.eligibleForSubmission
      .map(({ segment }) => segment)
      .filter((segment) =>
        ["ROAD", "SEA", "AIR"].includes(segment.route.transportMode),
      );
    if (segments.length === 0) return;
    opened.current = key;
    setDialog({ route: state.data.route, segments });
  }, [state, key, readOnly]);
  const prepareRefresh = (snapshot: ChangeVehiclesSnapshot) => {
    if (readOnly || state.kind !== "ready" || state.refreshing)
      throw new Error(
        "Wait for the current incident and route checks before submitting.",
      );
    const route = state.data.route;
    const verified = new Set(
      state.data.selection.eligibleForSubmission.map(
        ({ segment }) => segment.routePlanRouteId,
      ),
    );
    if (
      snapshot.routePlan.routePlanId !== route.routePlanId ||
      snapshot.routePlan.transportPlanId !== route.transportPlanId ||
      snapshot.routePlan.updatedAt !== route.updatedAt ||
      snapshot.segments.some(
        (segment) => !verified.has(segment.routePlanRouteId),
      )
    )
      throw new Error(
        "The eligible itinerary changed. Reload and review your selections before submitting.",
      );
    refresh.current = captureVehicleChangeRefresh(
      client,
      {
        ...snapshot.routePlan,
        bookingId: route.bookingId,
        segments: snapshot.segments,
      },
      context,
      {
        incidentReportId: state.data.incident.incidentReportId,
        genericInvalidationHandled: true,
      },
      (message, kind) => toast[kind](message),
    );
  };
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
          {state.data.selection.blocker && (
            <p role="status" className="m-0 text-muted-foreground">
              {state.data.selection.blocker}
            </p>
          )}
          <p className="m-0 text-xs">
            {state.data.selection.candidates.length} candidate segments ·{" "}
            {state.data.selection.excluded.length} excluded ·{" "}
            {state.data.selection.eligibleForSubmission.length} verified for
            submission
          </p>
          <ul className="m-0 list-none space-y-1 p-0 text-xs">
            {state.data.selection.unverified.map(
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
      {dialog && (
        <ChangeVehiclesDialog
          key={key}
          open
          mode="mid-trip"
          routePlan={state.kind === "ready" ? state.data.route : dialog.route}
          segments={
            state.kind === "ready"
              ? state.data.selection.eligibleForSubmission
                  .map(({ segment }) => segment)
                  .filter((segment) =>
                    ["ROAD", "SEA", "AIR"].includes(
                      segment.route.transportMode,
                    ),
                  )
              : dialog.segments
          }
          incidentReportId={incidentReportId}
          onOpenChange={(open) => {
            if (!open) {
              setDialog(null);
              onDismiss();
            }
          }}
          onBeforeSubmit={prepareRefresh}
          onChanged={(result) => refresh.current?.(result)}
          onReload={async () => {
            await onReloadWorkspace();
            if (state.kind === "ready") return state.reload();
            await client.refetchQueries(
              { queryKey: ["route-view", "vehicle-change-context"], type: "active" },
              { throwOnError: true },
            );
          }}
        />
      )}
    </section>
  );
}
