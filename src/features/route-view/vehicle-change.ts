import { getWorkspaceRole } from "@/features/transport-plan/workspace-role";
import {
  beforeDeparture,
  type RouteWorkspaceContext,
} from "./workspace-actions";
import type { RoutePlanDetail, RouteSegment } from "./types";
import type { RerouteContext } from "@/features/incident-response/reroute-schemas";

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
  authority?: Pick<
    RerouteContext,
    "currentSegment" | "remainingSegments" | "backupPlans" | "returnPlan"
  >,
) {
  const options = new Map(
    [
      ...(authority?.backupPlans ?? []),
      ...(authority?.returnPlan ? [authority.returnPlan] : []),
    ].map((plan) => [plan.routePlanId.toLowerCase(), plan]),
  );
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
    const branchSequenceNo = plan.branchSequenceNo ??
      options.get(plan.routePlanId.toLowerCase())?.branchSequenceNo;
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
              : plan.routeType === "BACKUP" && branchSequenceNo == null
                ? "BACKUP branch point is unavailable."
                : plan.routeType === "BACKUP" &&
                    branchSequenceNo != null &&
                    segment.sequenceNo < branchSequenceNo
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
  const itinerary = new Map(
    [
      ...(authority?.currentSegment ? [authority.currentSegment] : []),
      ...(authority?.remainingSegments ?? []),
    ].map((segment) => [segment.routePlanRouteId.toLowerCase(), segment]),
  );
  const owners = new Map(
    plans.map((plan) => [plan.routePlanId.toLowerCase(), plan]),
  );
  const eligibleForSubmission = candidates.filter((candidate) => {
    const actual = itinerary.get(
      candidate.segment.routePlanRouteId.toLowerCase(),
    );
    if (actual && !actual.actualArrivalAt && actual.status !== "COMPLETED") {
      const owner = owners.get(actual.routePlanId.toLowerCase());
      return Boolean(owner && ["ACTIVE", "CONFIRMED"].includes(owner.status));
    }
    const option = options.get(candidate.sourceRoutePlanId.toLowerCase());
    // RT1 evaluates segment locks before rest rules. A rest-rule failure blocks
    // activation, but still certifies the tail for vehicle replacement.
    return Boolean(
      option?.status === "CONFIRMED" &&
      (option.isAvailable || option.unavailableReason === "REST_RULE_VIOLATION") &&
      ["BACKUP", "RETURN"].includes(candidate.segment.routeType) &&
      (candidate.segment.routeType !== "BACKUP" ||
        (option.branchSequenceNo != null &&
          candidate.segment.sequenceNo >= option.branchSequenceNo)),
    );
  });
  const verifiedIds = new Set(
    eligibleForSubmission.map(({ segment }) => segment.routePlanRouteId),
  );
  const unverified = candidates
    .filter(({ segment }) => !verifiedIds.has(segment.routePlanRouteId))
    .map((candidate) => ({
      ...candidate,
      reason: options.get(candidate.sourceRoutePlanId.toLowerCase())?.unavailableReason === "SEGMENT_LOCKED"
        ? "RT1 cannot confirm this tail: a segment is locked or no replaceable itinerary remains."
        : "This segment has no matching effective itinerary or verified CONFIRMED option in RT1.",
    }));
  return {
    candidates,
    excluded,
    eligibleForSubmission,
    unverified,
    blocker:
      unverified.length > 0
        ? "Some segments have no authoritative eligibility confirmation and cannot be selected. Backend propagation still applies to eligible unlisted segments."
        : eligibleForSubmission.length === 0
          ? "No eligible internal segments could be verified for replacement."
          : null,
  };
}

export function getVehiclePropagationMessage(
  appliedSegmentIds: readonly string[],
) {
  return appliedSegmentIds.length
    ? `Vehicle changes were also applied to ${appliedSegmentIds.length} additional segments.`
    : null;
}
