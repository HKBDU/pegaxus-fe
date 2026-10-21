import type { HandoverBoundary, TrackingSegment } from "./types";

export function isSameDriverBoundary(
  boundary: Pick<
    HandoverBoundary,
    "fromRoutePlanRouteId" | "toRoutePlanRouteId"
  >,
  segments: TrackingSegment[],
) {
  if (!boundary.fromRoutePlanRouteId || !boundary.toRoutePlanRouteId)
    return false;
  const ordered = [...segments].sort((a, b) => a.displayOrder - b.displayOrder);
  const index = ordered.findIndex(
    (segment) => segment.routePlanRouteId === boundary.fromRoutePlanRouteId,
  );
  const from = ordered[index];
  const to = ordered[index + 1];
  return Boolean(
    from &&
    to &&
    to.routePlanRouteId === boundary.toRoutePlanRouteId &&
    !from.isOutsourced &&
    !to.isOutsourced &&
    from.driver?.employeeId.trim() &&
    from.driver.employeeId !== "00000000-0000-0000-0000-000000000000" &&
    from.driver.employeeId === to.driver?.employeeId,
  );
}

type TimelineEntry =
  | { kind: "leg"; segment: TrackingSegment }
  | {
      kind: "boundary";
      boundary: HandoverBoundary;
      position: "pickup" | "transfer" | "delivery" | "unmatched";
    };

// Only arrange the returned effective journey. Never select plans or recalculate leg status here.
export function buildTransportTimeline(
  segments: TrackingSegment[],
  boundaries: HandoverBoundary[],
): TimelineEntry[] {
  const ordered = [...segments].sort((a, b) => a.displayOrder - b.displayOrder);
  const remaining = new Set(boundaries);
  const entries: TimelineEntry[] = [];
  for (let index = 0; index <= ordered.length; index++) {
    const from = ordered[index - 1]?.routePlanRouteId ?? null;
    const to = ordered[index]?.routePlanRouteId ?? null;
    const matches = [...remaining]
      .filter(
        (boundary) =>
          boundary.fromRoutePlanRouteId === from &&
          boundary.toRoutePlanRouteId === to,
      )
      .sort((a, b) => a.boundaryNo - b.boundaryNo);
    for (const boundary of matches) {
      entries.push({
        kind: "boundary",
        boundary,
        position:
          index === 0
            ? "pickup"
            : index === ordered.length
              ? "delivery"
              : "transfer",
      });
      remaining.delete(boundary);
    }
    if (index < ordered.length)
      entries.push({ kind: "leg", segment: ordered[index] });
  }
  // Retain unexpected boundaries visibly instead of guessing their association or silently dropping them.
  for (const boundary of [...remaining].sort(
    (a, b) => a.boundaryNo - b.boundaryNo,
  )) {
    entries.push({ kind: "boundary", boundary, position: "unmatched" });
  }
  return entries;
}
