export const REJECTED_BY_MANAGER = "REJECTED_BY_MANAGER" as const;
export type RoutePlanStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | typeof REJECTED_BY_MANAGER;

export const ROUTE_PLAN_STATUSES = [
  "DRAFT",
  "CONFIRMED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  REJECTED_BY_MANAGER,
] as const satisfies readonly RoutePlanStatus[];

export const ROUTE_PLAN_STATUS_LABELS: Record<RoutePlanStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REJECTED_BY_MANAGER: "LM đã từ chối",
};

export function canEditRoutePlan(status: RoutePlanStatus): boolean {
  return status === "DRAFT";
}

export function canChangeVehiclesBeforeDeparture(plan: {
  routeType: string;
  status: RoutePlanStatus;
}): boolean {
  // The backend rejects any other type (INVALID_ROUTE_PLAN_TYPE) or status (INVALID_ROUTE_PLAN_STATUS).
  return plan.routeType === "PRIMARY" && plan.status === "CONFIRMED";
}

export function canChangeVehiclesMidTrip(plan: {
  status: RoutePlanStatus;
}): boolean {
  return plan.status === "ACTIVE";
}

export function canCancelRoutePlan(status: RoutePlanStatus): boolean {
  return status === "DRAFT";
}

export function canSubmitLegalReview(status: RoutePlanStatus): boolean {
  return status === "DRAFT";
}
