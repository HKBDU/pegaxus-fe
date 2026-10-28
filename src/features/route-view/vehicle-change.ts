import { getWorkspaceRole } from "@/features/transport-plan/workspace-role";
import {
  beforeDeparture,
  type RouteWorkspaceContext,
} from "./workspace-actions";
import type { RoutePlanDetail, RouteSegment } from "./types";

export const vehicleChangeDialogBlocker =
  "Vehicle replacement is temporarily unavailable. Please contact your logistics team.";

export function canChangeVehiclesBeforeDeparture(
  plan: RoutePlanDetail,
  workspace: RouteWorkspaceContext,
) {
  return (
    getWorkspaceRole(workspace.principal) === "coordinator" &&
    plan.routeType === "PRIMARY" &&
    plan.status === "CONFIRMED" &&
    workspace.planStatus !== "CANCELLED" &&
    beforeDeparture(workspace.transportStatus) &&
    plan.segments.length > 0 &&
    plan.segments.every(
      (segment) => !segment.actualDepartureAt && !segment.actualArrivalAt,
    )
  );
}

export type VehicleChangeCandidate = {
  sourceRoutePlanId: string;
  sourceRoutePlanCode: string;
  segment: RouteSegment;
};

export function collectVehicleChangeCandidates(
  plans: readonly RoutePlanDetail[],
  transportPlanId: string,
) {
  const candidates: VehicleChangeCandidate[] = [];
  const excluded: { segmentId: string; reason: string }[] = [];
  const seen = new Set<string>();
  for (const plan of plans) {
    if (
      plan.transportPlanId.toLowerCase() !== transportPlanId.toLowerCase() ||
      !(
        plan.status === "ACTIVE" ||
        (plan.status === "CONFIRMED" &&
          ["BACKUP", "RETURN"].includes(plan.routeType))
      )
    )
      continue;
    for (const segment of plan.segments) {
      const id = segment.routePlanRouteId.toLowerCase();
      if (seen.has(id)) continue;
      seen.add(id);
      const reason =
        segment.actualArrivalAt || segment.status === "COMPLETED"
          ? "Segment already arrived."
          : segment.isOutsourced
            ? "Segment is outsourced."
            : !segment.plannedDepartureAt || !segment.plannedArrivalAt
              ? "Planned departure or arrival is missing."
              : plan.routeType === "BACKUP" && plan.branchSequenceNo == null
                ? "BACKUP branch point is unavailable."
                : plan.routeType === "BACKUP" &&
                    plan.branchSequenceNo != null &&
                    segment.sequenceNo < plan.branchSequenceNo
                  ? "Segment is before the BACKUP branch point."
                  : null;
      if (reason)
        excluded.push({ segmentId: segment.routePlanRouteId, reason });
      else
        candidates.push({
          sourceRoutePlanId: plan.routePlanId,
          sourceRoutePlanCode: plan.routePlanCode,
          segment,
        });
    }
  }
  // RP3 omits SupersededAt. Candidates are read-only until that eligibility is authoritative.
  const eligibleForSubmission: VehicleChangeCandidate[] = [];
  return {
    candidates,
    excluded,
    eligibleForSubmission,
    blocker:
      "Segment eligibility could not be verified. Replacement remains blocked until the current itinerary can be confirmed.",
  };
}

export function getVehiclePropagationMessage(
  appliedSegmentIds: readonly string[],
) {
  return appliedSegmentIds.length
    ? `Vehicle changes were also applied to ${appliedSegmentIds.length} additional segments.`
    : null;
}
