import {
  APPROVAL_DECISION,
  EMERGENCY_COST_CATEGORY,
  EMERGENCY_COST_STATUS,
  HORSE_INCIDENT_TYPE,
  INCIDENT_ACTION,
  INCIDENT_CATEGORY,
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,
  VEHICLE_INCIDENT_TYPE,
  EMERGENCY_COST_ACTION,
} from "@/shared/constants/incident";

export type IncidentCategory =
  (typeof INCIDENT_CATEGORY)[keyof typeof INCIDENT_CATEGORY];
export type IncidentSeverity =
  (typeof INCIDENT_SEVERITY)[keyof typeof INCIDENT_SEVERITY];
export type IncidentStatus =
  (typeof INCIDENT_STATUS)[keyof typeof INCIDENT_STATUS];
export type VehicleIncidentType =
  (typeof VEHICLE_INCIDENT_TYPE)[keyof typeof VEHICLE_INCIDENT_TYPE];
export type HorseIncidentType =
  (typeof HORSE_INCIDENT_TYPE)[keyof typeof HORSE_INCIDENT_TYPE];
export type EmergencyCostCategory =
  (typeof EMERGENCY_COST_CATEGORY)[keyof typeof EMERGENCY_COST_CATEGORY];
export type EmergencyCostStatus =
  (typeof EMERGENCY_COST_STATUS)[keyof typeof EMERGENCY_COST_STATUS];
export type ApprovalDecision =
  (typeof APPROVAL_DECISION)[keyof typeof APPROVAL_DECISION];
export type IncidentAction =
  (typeof INCIDENT_ACTION)[keyof typeof INCIDENT_ACTION];
export type EmergencyCostAction =
  (typeof EMERGENCY_COST_ACTION)[keyof typeof EMERGENCY_COST_ACTION];

export type IncidentAudience = "INTERNAL" | "CUSTOMER";
export type IncidentRole =
  | "CUSTOMER"
  | "DRIVER"
  | "ESCORT"
  | "OPERATOR"
  | "VETERINARIAN"
  | "MANAGER"
  | "LOGISTICS_MANAGER"
  | "FLEET_ROUTE_COORDINATOR"
  | "ADMIN";

export interface TransportBrief {
  transportId: string;
  transportCode: string;
  status: string;
  bookingCode: string;
}

export interface LocationBrief {
  locationId?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}

export interface IncidentLocation {
  locationId: string;
  locationName: string;
  locationType?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  latitude: number | null;
  longitude: number | null;
  updatedAt?: string | null;
}

export interface EmployeeBrief {
  employeeId: string;
  employeeCode?: string;
  fullName: string;
  role: IncidentRole;
  phone?: string | null;
}

export interface IncidentSummary {
  incidentReportId: string;
  incidentCode: string;
  transport: TransportBrief;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  occurredAt: string;
  reportedAt: string;
  location: LocationBrief;
  reportedBy: EmployeeBrief;
  vehicle: {
    vehicleId: string;
    vehicleCode: string;
    licensePlate?: string;
  } | null;
  horses: Array<{ horseId: string; horseName: string }>;
  emergencySettlementRequired: boolean;
  costRequestCount: number;
  pendingCostCount: number;
  approvedTotal: number;
  updatedAt: string;
}

export interface IncidentDetail extends IncidentSummary {
  description: string;
  immediateAction: string | null;
  resolutionSummary: string | null;
  resolvedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  vehicleDetail: VehicleIncidentDetail | null;
  horseDetails: HorseIncidentDetail[];
  photos: IncidentPhoto[];
  photoCount: number;
  costRequests: EmergencyCostRequest[];
  costSummary: {
    requestedTotal: number;
    approvedTotal: number;
    pendingCount: number;
    currency: string;
  };
  routeChanges: Array<{
    routePlanId: string;
    routePlanCode: string;
    routeType: string;
    status: string;
    updatedAt: string;
  }>;
  hold: IncidentHold | null;
  canResolve: boolean;
  availableActions: IncidentAction[];
  serverTime: string;
  createdAt: string;
}

export interface IncidentActor {
  id: string;
  name: string;
  role: IncidentRole;
  phone?: string;
}

export interface VehicleIncidentDetail {
  vehicleIncidentDetailId: string;
  vehicle: {
    vehicleId: string;
    vehicleCode: string;
    licensePlate?: string;
    vehicleName?: string;
    status: string;
  };
  incidentType: VehicleIncidentType;
  vehicleCondition: string | null;
  damageDescription: string | null;
  repairNote: string | null;
  vehicleOperable: boolean;
  repairRequired: boolean;
  towingRequired: boolean;
  replacementVehicleRequired: boolean;
  estimatedRepairCost: number | null;
  estimatedRepairHours: number | null;
  driverSafetyStatus: string | null;
  cargoConditionNote: string | null;
  updatedAt: string;
}

export interface HorseIncidentDetail {
  horseHealthIncidentDetailId: string;
  horse: {
    horseId: string;
    horseName: string;
    microchipNumber?: string;
    breed?: string;
    stallNo?: string | null;
  };
  incidentType: HorseIncidentType;
  conditionDescription: string;
  symptoms: string | null;
  bodyTemperatureCelsius: number | null;
  heartRateBpm: number | null;
  respiratoryRateBpm: number | null;
  firstAidProvided: string | null;
  veterinarianRequired: boolean;
  veterinarianContactedAt: string | null;
  isolationRequired: boolean;
  veterinarianInstruction: string | null;
  medicationGiven: string | null;
  outcomeNote: string | null;
  horseTransportable: boolean | null;
  vitalWarnings: string[];
  updatedAt: string;
}

export type IncidentPhoto = {
  photoId: string;
  photoUrl: string;
  caption?: string;
  horseHealthIncidentDetailId?: string | null;
  sortOrder: number;
};
export type IncidentHold = {
  status: "ACTIVE" | "EXPIRED";
  startedAt: string;
  holdUntil: string;
  holdMinutes: number;
  monitorIntervalMinutes: number;
  reason: string;
  safeStopLocation: string;
  decidedBy: EmployeeBrief;
};

export interface EmergencyCostRequest {
  emergencyCostRequestId: string;
  requestCode: string;
  incident: {
    incidentReportId: string;
    incidentCode: string;
    category: IncidentCategory;
    severity: IncidentSeverity;
    status: IncidentStatus;
    transportId: string;
  };
  category: EmergencyCostCategory;
  description: string;
  justification: string;
  requestedAmount: number;
  approvedAmount: number | null;
  currency: string;
  status: EmergencyCostStatus;
  requestedBy: EmployeeBrief | null;
  decision: {
    decision: ApprovalDecision;
    approvedAmount: number;
    decisionReason: string;
    decidedBy: EmployeeBrief;
    decidedAt: string;
  } | null;
  requestedAt: string;
  cancelledAt: string | null;
  cancellationReason: string | null;
  availableActions?: EmergencyCostAction[];
  invoiceRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableAction {
  key: IncidentAction | EmergencyCostAction;
  label: string;
  requiresConfirmation?: boolean;
  disabled?: boolean;
}

export interface CustomerIncidentView {
  id: string;
  bookingId: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description?: string;
  reportedAt: string;
  lastUpdatedAt: string;
  costsHidden: true;
  contactPhoneHidden: true;
}

export interface IncidentListResponse {
  items: IncidentSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PhotoFile {
  publicId: string;
}
export interface VehicleIncidentRequest {
  transportId: string;
  vehicleId: string;
  category: Extract<IncidentCategory, "VEHICLE" | "BOTH">;
  incidentType: VehicleIncidentType;
  severity: IncidentSeverity;
  title: string;
  description: string;
  immediateAction?: string;
  vehicleOperable: boolean;
  vehicleCondition?: string;
  damageDescription?: string;
  repairRequired?: boolean;
  towingRequired?: boolean;
  replacementVehicleRequired?: boolean;
  estimatedRepairCost?: number;
  estimatedRepairHours?: number;
  repairNote?: string;
  emergencySettlementRequired: boolean;
  occurredAt: string;
  latitude?: number;
  longitude?: number;
  locationId?: string;
  locationDescription?: string;
  photoFiles?: PhotoFile[];
}
export interface HorseHealthIncidentRequest {
  transportId: string;
  severity: IncidentSeverity;
  title?: string;
  immediateAction?: string;
  emergencySettlementRequired: boolean;
  occurredAt: string;
  latitude?: number;
  longitude?: number;
  locationId?: string;
  locationDescription?: string;
  horses: HorseHealthDetailRequest[];
  photoFiles?: PhotoFile[];
}
export interface HorseHealthDetailRequest {
  horseId: string;
  incidentType: HorseIncidentType;
  conditionDescription: string;
  symptoms?: string;
  bodyTemperatureCelsius?: number;
  heartRateBpm?: number;
  respiratoryRateBpm?: number;
  firstAidProvided?: string;
  veterinarianRequired: boolean;
  isolationRequired?: boolean;
  veterinarianContactedAt?: string;
  veterinarianInstruction?: string;
  medicationGiven?: string;
  horseTransportable?: boolean | null;
}
export interface AddHorseDetailsRequest {
  horses: HorseHealthDetailRequest[];
  photoFiles?: PhotoFile[];
}
export interface SupplementVehicleRequest extends Partial<
  Pick<
    VehicleIncidentDetail,
    | "repairNote"
    | "estimatedRepairCost"
    | "vehicleOperable"
    | "repairRequired"
    | "towingRequired"
    | "replacementVehicleRequired"
    | "vehicleCondition"
    | "damageDescription"
    | "estimatedRepairHours"
    | "driverSafetyStatus"
    | "cargoConditionNote"
  >
> {
  lastUpdatedAt: string;
  photoFiles?: PhotoFile[];
}
export interface VeterinaryOutcomeRequest {
  lastUpdatedAt: string;
  outcomeNote?: string;
  medicationGiven?: string;
  veterinarianInstruction?: string;
  veterinarianContactedAt?: string;
  horseTransportable?: boolean | null;
}
export interface RaiseSeverityRequest {
  lastUpdatedAt: string;
  severity: IncidentSeverity;
  reason: string;
}

export interface IncidentEffects {
  customerNotified?: boolean;
  emailQueued?: boolean;
  vehicleStatusChanged?: boolean;
  canAddHorseDetails?: boolean;
  firstAidGuide?: string[];
  vitalWarnings?: string[];
}

export type IncidentMutationResponse = IncidentDetail & {
  effects?: IncidentEffects;
};

export interface EmergencyContact {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  role: string;
  phone: string | null;
}

export interface EmergencyContactsResponse {
  serverTime: string;
  transportId: string;
  contacts: EmergencyContact[];
}

export interface IncidentDetailResponse {
  data: IncidentDetail;
  lastUpdatedAt: string;
  availableActions: AvailableAction[];
}

export interface CustomerIncidentResponse {
  data: CustomerIncidentView;
  lastUpdatedAt: string;
}
