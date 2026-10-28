export const INCIDENT_CATEGORY = {
  VEHICLE: "VEHICLE",
  HORSE_HEALTH: "HORSE_HEALTH",
  BOTH: "BOTH",
  ROUTE_CHANGE: "ROUTE_CHANGE",
} as const;

export const INCIDENT_SEVERITY = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const;

export const INCIDENT_STATUS = {
  REPORTED: "REPORTED",
  PENDING: "PENDING",
  RESOLVED: "RESOLVED",
  CANCELLED: "CANCELLED",
} as const;

export const VEHICLE_INCIDENT_TYPE = {
  BREAKDOWN: "BREAKDOWN",
  ACCIDENT: "ACCIDENT",
  TIRE_DAMAGE: "TIRE_DAMAGE",
  ENGINE_FAILURE: "ENGINE_FAILURE",
  TEMPERATURE_CONTROL_FAILURE: "TEMPERATURE_CONTROL_FAILURE",
  EQUIPMENT_FAILURE: "EQUIPMENT_FAILURE",
  OTHER: "OTHER",
} as const;

export const HORSE_INCIDENT_TYPE = {
  INJURY: "INJURY",
  DEHYDRATION: "DEHYDRATION",
  RESPIRATORY_ISSUE: "RESPIRATORY_ISSUE",
  FEVER: "FEVER",
  STRESS: "STRESS",
  COLIC: "COLIC",
  FATIGUE: "FATIGUE",
  OTHER: "OTHER",
} as const;

export const EMERGENCY_COST_CATEGORY = {
  VETERINARY: "VETERINARY",
  MEDICATION: "MEDICATION",
  VEHICLE_REPAIR: "VEHICLE_REPAIR",
  TOWING: "TOWING",
  REPLACEMENT_VEHICLE: "REPLACEMENT_VEHICLE",
  EMERGENCY_STABLE: "EMERGENCY_STABLE",
  ROUTE_CHANGE: "ROUTE_CHANGE",
  ACCOMMODATION: "ACCOMMODATION",
  OTHER: "OTHER",
} as const;

export const EMERGENCY_COST_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;

export const APPROVAL_DECISION = {
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export const INCIDENT_ACTION = {
  ADD_HORSE_DETAIL: "ADD_HORSE_DETAIL",
  SUPPLEMENT_VEHICLE: "SUPPLEMENT_VEHICLE",
  FOLLOW_UP_HORSE: "FOLLOW_UP_HORSE",
  REQUEST_COST: "REQUEST_COST",
  PROPOSE_REROUTE: "PROPOSE_REROUTE",
  ESCALATE_REROUTE: "ESCALATE_REROUTE",
  HOLD_ROUTE: "HOLD_ROUTE",
  DECIDE_COST: "DECIDE_COST",
  RESOLVE: "RESOLVE",
  SELF_RESOLVE: "SELF_RESOLVE",
  RAISE_SEVERITY: "RAISE_SEVERITY",
  LOWER_SEVERITY: "LOWER_SEVERITY",
  CANCEL_INCIDENT: "CANCEL_INCIDENT",
} as const;

export const EMERGENCY_COST_ACTION = {
  DECIDE: "DECIDE",
  CANCEL: "CANCEL",
} as const;

export const INCIDENT_ACCENT_COLOR = "#F39200";
export const INCIDENT_CHARCOAL_COLOR = "#181818";

export const INCIDENT_ERROR_MESSAGES: Record<string, string> = {
  INCIDENT_MODIFIED:
    "This incident was changed by someone else. Reload to see the latest version.",
  INVALID_INCIDENT_STATUS:
    "This incident can no longer be changed in its current status.",
  SEVERITY_LOWER_MANAGER_ONLY:
    "Only the Logistics Manager can lower incident severity.",
  SEVERITY_UNCHANGED: "Choose a different severity before saving.",
  NETWORK_ERROR: "Cannot reach the server. Check your connection and try again.",
};

type IncidentValue = string;
export type IncidentTone =
  "neutral" | "info" | "warning" | "danger" | "success";

export interface IncidentOption<T extends IncidentValue = string> {
  label: string;
  tone: IncidentTone;
  value: T;
}

const option = <T extends IncidentValue>(
  value: T,
  label: string,
  tone: IncidentTone,
): IncidentOption<T> => ({ value, label, tone });

export const INCIDENT_CATEGORY_OPTIONS = {
  VEHICLE: option(INCIDENT_CATEGORY.VEHICLE, "Vehicle", "warning"),
  HORSE_HEALTH: option(
    INCIDENT_CATEGORY.HORSE_HEALTH,
    "Horse Health",
    "danger",
  ),
  BOTH: option(INCIDENT_CATEGORY.BOTH, "Vehicle and Horse Health", "danger"),
  ROUTE_CHANGE: option(INCIDENT_CATEGORY.ROUTE_CHANGE, "Route Change", "info"),
} as const;

export const INCIDENT_SEVERITY_OPTIONS = {
  LOW: option(INCIDENT_SEVERITY.LOW, "Low", "neutral"),
  MEDIUM: option(INCIDENT_SEVERITY.MEDIUM, "Medium", "warning"),
  HIGH: option(INCIDENT_SEVERITY.HIGH, "High", "warning"),
  CRITICAL: option(INCIDENT_SEVERITY.CRITICAL, "Critical", "danger"),
} as const;

export const INCIDENT_STATUS_OPTIONS = {
  REPORTED: option(INCIDENT_STATUS.REPORTED, "Reported", "info"),
  PENDING: option(INCIDENT_STATUS.PENDING, "Pending", "warning"),
  RESOLVED: option(INCIDENT_STATUS.RESOLVED, "Resolved", "success"),
  CANCELLED: option(INCIDENT_STATUS.CANCELLED, "Cancelled", "neutral"),
} as const;

export const EMERGENCY_COST_STATUS_OPTIONS = {
  PENDING: option(EMERGENCY_COST_STATUS.PENDING, "Pending", "warning"),
  APPROVED: option(EMERGENCY_COST_STATUS.APPROVED, "Approved", "success"),
  REJECTED: option(EMERGENCY_COST_STATUS.REJECTED, "Rejected", "danger"),
  CANCELLED: option(EMERGENCY_COST_STATUS.CANCELLED, "Cancelled", "neutral"),
} as const;

export const INCIDENT_ACTION_LABELS: Record<
  (typeof INCIDENT_ACTION)[keyof typeof INCIDENT_ACTION],
  string
> = {
  ADD_HORSE_DETAIL: "Add Horse Detail",
  SUPPLEMENT_VEHICLE: "Supplement Vehicle",
  FOLLOW_UP_HORSE: "Follow Up Horse",
  REQUEST_COST: "Request Cost",
  PROPOSE_REROUTE: "Propose Reroute",
  ESCALATE_REROUTE: "Escalate Reroute",
  HOLD_ROUTE: "Hold Route",
  DECIDE_COST: "Decide Cost",
  RESOLVE: "Resolve",
  SELF_RESOLVE: "Self Resolve",
  RAISE_SEVERITY: "Raise Severity",
  LOWER_SEVERITY: "Lower Severity",
  CANCEL_INCIDENT: "Cancel Incident",
};

export const EMERGENCY_COST_ACTION_LABELS: Record<
  (typeof EMERGENCY_COST_ACTION)[keyof typeof EMERGENCY_COST_ACTION],
  string
> = {
  DECIDE: "Decide Cost",
  CANCEL: "Cancel Cost Request",
};

export const VEHICLE_INCIDENT_TYPE_LABELS: Record<
  (typeof VEHICLE_INCIDENT_TYPE)[keyof typeof VEHICLE_INCIDENT_TYPE],
  string
> = {
  BREAKDOWN: "Breakdown",
  ACCIDENT: "Accident",
  TIRE_DAMAGE: "Tire Damage",
  ENGINE_FAILURE: "Engine Failure",
  TEMPERATURE_CONTROL_FAILURE: "Temperature Control Failure",
  EQUIPMENT_FAILURE: "Equipment Failure",
  OTHER: "Other",
};

export const HORSE_INCIDENT_TYPE_LABELS: Record<
  (typeof HORSE_INCIDENT_TYPE)[keyof typeof HORSE_INCIDENT_TYPE],
  string
> = {
  INJURY: "Injury",
  DEHYDRATION: "Dehydration",
  RESPIRATORY_ISSUE: "Respiratory Issue",
  FEVER: "Fever",
  STRESS: "Stress",
  COLIC: "Colic",
  FATIGUE: "Fatigue",
  OTHER: "Other",
};

export const EMERGENCY_COST_CATEGORY_LABELS: Record<
  (typeof EMERGENCY_COST_CATEGORY)[keyof typeof EMERGENCY_COST_CATEGORY],
  string
> = {
  VETERINARY: "Veterinary",
  MEDICATION: "Medication",
  VEHICLE_REPAIR: "Vehicle Repair",
  TOWING: "Towing",
  REPLACEMENT_VEHICLE: "Replacement Vehicle",
  EMERGENCY_STABLE: "Emergency Stable",
  ROUTE_CHANGE: "Route Change",
  ACCOMMODATION: "Accommodation",
  OTHER: "Other",
};

export const APPROVAL_DECISION_LABELS: Record<
  (typeof APPROVAL_DECISION)[keyof typeof APPROVAL_DECISION],
  string
> = {
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const INCIDENT_FORM_UNPERSISTED_FIELDS = ["receiptPhotos"] as const;

export const incidentPaths = {
  detail: (roleOrAudience: string, incidentId: string) =>
    roleOrAudience === "CUSTOMER"
      ? `/bookings/incidents/${incidentId}`
      : roleOrAudience === "INTERNAL" ||
          roleOrAudience === "ADMIN" ||
          roleOrAudience === "LM" ||
          roleOrAudience === "RC" ||
          roleOrAudience === "TS"
        ? `/admin/incidents/${incidentId}`
        : `/crew/incidents/${incidentId}`,
  reroute: (incidentReportId: string) =>
    `/admin/incidents/${incidentReportId}/reroute`,
  emergencyCost: (emergencyCostRequestId: string) =>
    `/admin/emergency-costs/${emergencyCostRequestId}`,
  newVehicle: () => "/crew/incidents/new/vehicle",
  newHorseHealth: () => "/crew/incidents/new/horse-health",
  customerDetail: (
    bookingId: string,
    transportId: string,
    incidentId: string,
  ) =>
    `/bookings/${bookingId}/transports/${transportId}/incidents/${incidentId}`,
} as const;

export function isHighIncidentSeverity(severity: string): boolean {
  return (
    severity === INCIDENT_SEVERITY.HIGH ||
    severity === INCIDENT_SEVERITY.CRITICAL
  );
}
