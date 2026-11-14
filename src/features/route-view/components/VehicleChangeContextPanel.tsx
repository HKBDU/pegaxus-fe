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
  // Set once a change was saved, so closing the dialog afterwards also closes the replacement context.
  const changed = useRef(false);
  const key = `${plan.routePlanId}:${incidentReportId}`;
  // The candidates mix the ACTIVE route's remaining segments with the tails of CONFIRMED BACKUP / RETURN plans, and each
  // plan numbers its segments from 1. They are ordered by plan (ACTIVE route first), then by segment number.
  const activeRouteId = state.kind === "ready" ? state.data.route.routePlanId.toLowerCase() : "";
  const reportedVehicle = state.kind === "ready" ? state.data.incident.vehicleDetail?.vehicle : undefined;
  const orderedSegments =
    state.kind === "ready"
      ? state.data.selection.eligibleForSubmission
          .filter(({ segment }) =>
            ["ROAD", "SEA", "AIR"].includes(segment.route.transportMode),
          )
          .map(({ segment, sourceRoutePlanId, sourceRoutePlanCode, sourceRouteType }) => ({
            segment: {
              ...segment,
              sourceLabel: `${sourceRouteType} · ${sourceRoutePlanCode}${sourceRoutePlanId.toLowerCase() === activeRouteId ? " · Active route" : ""}`,
            },
            order: sourceRoutePlanId.toLowerCase() === activeRouteId ? 0 : sourceRouteType === "BACKUP" ? 1 : 2,
            plan: sourceRoutePlanCode,
          }))
          .sort((left, right) =>
            left.order - right.order ||
            left.plan.localeCompare(right.plan) ||
            left.segment.sequenceNo - right.segment.sequenceNo,
          )
          .map(({ segment }) => segment)
      : [];
  // The BE replaces only the vehicle the incident reports, and then gives the same replacement to every later segment of
  // the active route and of the confirmed backup that still uses it. So the dialog offers just the first segment that
  // carries the reported vehicle (the one on the road), instead of every vehicle of every segment.
  const incidentSegment = reportedVehicle
    ? orderedSegments.find((segment) =>
        segment.vehicles.some(
          (vehicle) => vehicle.vehicleId.toLowerCase() === reportedVehicle.vehicleId.toLowerCase(),
        ),
      )
    : undefined;
  const eligibleSegments = incidentSegment ? [incidentSegment] : [];
  const reportedVehicleName = reportedVehicle
    ? reportedVehicle.licensePlate ?? reportedVehicle.vehicleCode
    : null;
  const canOpen =
    !readOnly && state.kind === "ready" && !state.refreshing && eligibleSegments.length > 0;
  const openDialog = () => {
    if (!canOpen || state.kind !== "ready") return;
    setDialog({ route: state.data.route, segments: eligibleSegments });
  };
  useEffect(() => {
    if (!canOpen || opened.current === key) return;
    opened.current = key;
    openDialog();
    // Opens once per incident and route; the button below reopens it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canOpen, key]);
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
        <div className="flex flex-wrap items-center gap-2">
          {canOpen && !dialog ? (
            <Button type="button" size="sm" onClick={openDialog}>
              Change vehicles
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
            Close replacement context
          </Button>
        </div>
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
          {reportedVehicleName ? (
            <p className="m-0 text-xs text-muted-foreground">
              {incidentSegment
                ? `Only ${reportedVehicleName}, reported in this incident, can be replaced on segment ${incidentSegment.sequenceNo}. Later segments of the active route and of the backup that use it get the same replacement automatically.`
                : `No remaining segment uses ${reportedVehicleName}, the vehicle reported in this incident.`}
            </p>
          ) : null}
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
              ({ sourceRoutePlanCode, segment, reason }) => (
                <li key={segment.routePlanRouteId} className="break-words">
                  Viewed in {sourceRoutePlanCode} · {segment.routeType} segment{" "}
                  {segment.sequenceNo}: {segment.fromLocation.locationName} →{" "}
                  {segment.toLocation.locationName} · {reason}
                </li>
              ),
            )}
          </ul>
          {state.data.unavailableRoutes?.map(({ routePlanId, reason }) => (
            <p key={routePlanId} className="m-0 break-words text-xs text-muted-foreground">
              Route {routePlanId} unavailable: {reason}
            </p>
          ))}
        </>
      )}
      {dialog && (
        <ChangeVehiclesDialog
          key={key}
          open
          mode="mid-trip"
          routePlan={state.kind === "ready" ? state.data.route : dialog.route}
          segments={state.kind === "ready" ? eligibleSegments : dialog.segments}
          incidentReportId={incidentReportId}
          onOpenChange={(open) => {
            if (!open) {
              // Closing without saving keeps the context, so "Change vehicles" can reopen the dialog.
              setDialog(null);
              if (changed.current) onDismiss();
            }
          }}
          onBeforeSubmit={prepareRefresh}
          onChanged={(result) => {
            changed.current = true;
            return refresh.current?.(result);
          }}
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
