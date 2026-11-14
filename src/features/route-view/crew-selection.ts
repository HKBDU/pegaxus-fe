import type {
  CrewOverride,
  CrewPlan,
  CrewSegment,
} from "./types";

/** What the LM ends up with on a segment: the suggestion, overridden field by field. */
export function effectiveCrew(
  item: CrewSegment,
  override?: CrewOverride,
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

/** Internal segments still missing a driver, an escort or (when checked here) a vehicle, keyed by segment id. */
export function crewSelectionErrors(
  plan: CrewPlan,
  overrides: Record<string, CrewOverride>,
  options: { checkVehicles?: boolean; outsourcedIds?: ReadonlySet<string> } = {},
) {
  const { checkVehicles = true, outsourcedIds } = options;
  const errors: Record<string, string> = {};
  for (const item of plan.segments) {
    const id = item.segment.routePlanRouteId;
    if (item.segment.executionType !== "INTERNAL" || outsourcedIds?.has(id)) continue;
    const crew = effectiveCrew(item, overrides[id]);
    if (!crew.driverId || !crew.escortId)
      errors[id] = "Pick a driver and an escort.";
    else if (checkVehicles && crew.vehicleIds.length === 0)
      errors[id] = "Pick at least one vehicle.";
  }
  return errors;
}
