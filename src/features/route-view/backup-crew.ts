import type {
  BackupCrewOverride,
  BackupCrewPlan,
  BackupCrewSegment,
} from "./types";

/** What the LM ends up with on a segment: the suggestion, overridden field by field. */
export function effectiveCrew(
  item: BackupCrewSegment,
  override?: BackupCrewOverride,
) {
  return {
    driverId:
      override?.driverEmployeeId ?? item.segment.driver?.employeeId ?? null,
    escortId:
      override?.escortEmployeeId ?? item.segment.escort?.employeeId ?? null,
    vehicleIds:
      override?.vehicleIds ??
      item.segment.vehicles.map((vehicle) => vehicle.vehicleId),
  };
}

/** Internal segments still missing a driver, an escort or a vehicle, keyed by segment id. */
export function crewSelectionErrors(
  plan: BackupCrewPlan,
  overrides: Record<string, BackupCrewOverride>,
) {
  const errors: Record<string, string> = {};
  for (const item of plan.segments) {
    if (item.segment.executionType !== "INTERNAL") continue;
    const crew = effectiveCrew(item, overrides[item.segment.routePlanRouteId]);
    if (!crew.driverId || !crew.escortId || crew.vehicleIds.length === 0)
      errors[item.segment.routePlanRouteId] =
        "Pick a driver, an escort and at least one vehicle.";
  }
  return errors;
}
