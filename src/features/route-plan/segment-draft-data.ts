import type { DraftSegment } from "./components/RoutePlanBuilderParts";
import type { RouteSegment } from "./types";

/** What a saved segment holds besides its route: the resources and times the builder must not lose. */
export type SegmentDraftData = Partial<
  Pick<
    DraftSegment,
    | "provider"
    | "note"
    | "dwellAfterMinutes"
    | "plannedDepartureAt"
    | "plannedArrivalAt"
    | "vehicleIds"
  >
>;

/** Vehicles, provider, note, dwell and times of a saved segment, in the shape of a builder draft segment. */
export function draftDataFromSegment(segment: RouteSegment): SegmentDraftData {
  const vehicleIds = (segment.vehicles ?? []).map((vehicle) => vehicle.vehicleId);
  return {
    ...(segment.outsourcing?.provider
      ? { provider: segment.outsourcing.provider }
      : {}),
    ...(segment.note ? { note: segment.note } : {}),
    ...(vehicleIds.length ? { vehicleIds } : {}),
    ...(segment.dwellAfterMinutes != null
      ? { dwellAfterMinutes: segment.dwellAfterMinutes }
      : {}),
    plannedDepartureAt: segment.plannedDepartureAt,
    plannedArrivalAt: segment.plannedArrivalAt,
  };
}
