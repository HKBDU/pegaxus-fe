import {
  EMERGENCY_COST_CATEGORY,
  EMERGENCY_COST_STATUS,
  INCIDENT_ACTION,
  INCIDENT_CATEGORY,
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,
  VEHICLE_INCIDENT_TYPE,
  HORSE_INCIDENT_TYPE,
} from "@/shared/constants/incident";
import type {
  AddHorseDetailsRequest,
  CustomerIncidentView,
  EmergencyCostRequest,
  HorseHealthIncidentRequest,
  IncidentAction,
  IncidentDetail,
  IncidentSummary,
  RaiseSeverityRequest,
  SupplementVehicleRequest,
  VehicleIncidentRequest,
  VeterinaryOutcomeRequest,
} from "@/shared/types/incident";

const transport = (id: string) => ({
  transportId: id,
  transportCode: id,
  status: "IN_TRANSIT",
  bookingCode: `BK-${id}`,
});
const reporter = {
  employeeId: "EMP-001",
  employeeCode: "DRV-001",
  fullName: "Jordan Lee",
  role: "DRIVER" as const,
  phone: "+84987654321",
};
const summary = (
  incidentReportId: string,
  category: IncidentSummary["category"],
  severity: IncidentSummary["severity"],
  status: IncidentSummary["status"],
  title: string,
): IncidentSummary => ({
  incidentReportId,
  incidentCode: `INC-20261020-${incidentReportId}`,
  transport: transport(`TR-${incidentReportId}`),
  category,
  severity,
  status,
  title,
  occurredAt: "2026-10-20T08:00:00Z",
  reportedAt: "2026-10-20T08:15:00Z",
  location: { description: "Ninh Binh" },
  reportedBy: reporter,
  vehicle: {
    vehicleId: `VH-${incidentReportId}`,
    vehicleCode: `VH-${incidentReportId}`,
    licensePlate: "51A-123.45",
  },
  horses: [],
  emergencySettlementRequired: false,
  costRequestCount: 0,
  pendingCostCount: 0,
  approvedTotal: 0,
  updatedAt: "2026-10-20T08:30:00Z",
});

export const incidentMockSummaries: IncidentSummary[] = [
  summary(
    "IN1",
    INCIDENT_CATEGORY.VEHICLE,
    INCIDENT_SEVERITY.HIGH,
    INCIDENT_STATUS.REPORTED,
    "Vehicle engine failure",
  ),
  summary(
    "IN2",
    INCIDENT_CATEGORY.HORSE_HEALTH,
    INCIDENT_SEVERITY.CRITICAL,
    INCIDENT_STATUS.PENDING,
    "Horse requires veterinary attention",
  ),
  summary(
    "IN3",
    INCIDENT_CATEGORY.BOTH,
    INCIDENT_SEVERITY.CRITICAL,
    INCIDENT_STATUS.PENDING,
    "Collision affecting horse transport",
  ),
];

const pendingCost: EmergencyCostRequest = {
  emergencyCostRequestId: "COST-001",
  requestCode: "ECR-20261020-0001",
  incident: {
    incidentReportId: "IN2",
    incidentCode: "INC-20261020-IN2",
    category: INCIDENT_CATEGORY.HORSE_HEALTH,
    severity: INCIDENT_SEVERITY.CRITICAL,
    status: INCIDENT_STATUS.PENDING,
    transportId: "TR-IN2",
  },
  category: EMERGENCY_COST_CATEGORY.VETERINARY,
  description: "Emergency veterinary examination",
  justification: "Urgent horse assessment",
  requestedAmount: 3_500_000,
  approvedAmount: null,
  currency: "VND",
  status: EMERGENCY_COST_STATUS.PENDING,
  requestedBy: reporter,
  decision: null,
  requestedAt: "2026-10-20T09:30:00Z",
  cancelledAt: null,
  cancellationReason: null,
  invoiceRequired: false,
  createdAt: "2026-10-20T09:30:00Z",
  updatedAt: "2026-10-20T09:30:00Z",
};
const actions: Record<string, IncidentAction[]> = {
  IN1: [INCIDENT_ACTION.SUPPLEMENT_VEHICLE, INCIDENT_ACTION.RAISE_SEVERITY],
  IN2: [INCIDENT_ACTION.FOLLOW_UP_HORSE, INCIDENT_ACTION.REQUEST_COST],
  IN3: [INCIDENT_ACTION.SUPPLEMENT_VEHICLE, INCIDENT_ACTION.ADD_HORSE_DETAIL],
};
const baseDetail = (item: IncidentSummary): IncidentDetail => ({
  ...item,
  description: "The transport requires immediate attention.",
  immediateAction: "Moved to a safe location.",
  resolutionSummary: null,
  resolvedAt: null,
  cancelledAt: null,
  cancellationReason: null,
  vehicleDetail:
    item.category === INCIDENT_CATEGORY.HORSE_HEALTH
      ? null
      : {
          vehicleIncidentDetailId: `VID-${item.incidentReportId}`,
          vehicle: {
            vehicleId: item.vehicle?.vehicleId ?? "VH-001",
            vehicleCode: "VH-001",
            licensePlate: "51A-123.45",
            status: "IN_SERVICE",
          },
          incidentType: VEHICLE_INCIDENT_TYPE.ENGINE_FAILURE,
          vehicleCondition: null,
          damageDescription: null,
          repairNote: "Vehicle cannot continue safely.",
          vehicleOperable: false,
          repairRequired: true,
          towingRequired: true,
          replacementVehicleRequired: false,
          estimatedRepairCost: null,
          estimatedRepairHours: null,
          driverSafetyStatus: null,
          cargoConditionNote: null,
          updatedAt: item.updatedAt,
        },
  horseDetails:
    item.category === INCIDENT_CATEGORY.VEHICLE
      ? []
      : [
          {
            horseHealthIncidentDetailId: `HID-${item.incidentReportId}`,
            horse: { horseId: "HR-002", horseName: "Silver Comet" },
            incidentType: HORSE_INCIDENT_TYPE.RESPIRATORY_ISSUE,
            conditionDescription: "Rapid breathing",
            symptoms: "Rapid breathing",
            bodyTemperatureCelsius: null,
            heartRateBpm: null,
            respiratoryRateBpm: null,
            firstAidProvided: null,
            veterinarianRequired: true,
            veterinarianContactedAt: null,
            isolationRequired: false,
            veterinarianInstruction: null,
            medicationGiven: null,
            outcomeNote: null,
            horseTransportable: null,
            vitalWarnings: [],
            updatedAt: item.updatedAt,
          },
        ],
  photos: [
    {
      photoId: "PHOTO-001",
      photoUrl: "/mock/incident-engine.jpg",
      caption: "Engine condition",
      sortOrder: 0,
    },
  ],
  photoCount: 1,
  costRequests: item.incidentReportId === "IN2" ? [pendingCost] : [],
  costSummary: {
    requestedTotal: item.incidentReportId === "IN2" ? 3_500_000 : 0,
    approvedTotal: 0,
    pendingCount: item.incidentReportId === "IN2" ? 1 : 0,
    currency: "VND",
  },
  routeChanges: [],
  hold: null,
  canResolve: false,
  availableActions: actions[item.incidentReportId] ?? [],
  serverTime: item.updatedAt,
  createdAt: item.reportedAt,
});
export const incidentMockDetails = incidentMockSummaries.map(baseDetail);
export const incidentMockCustomer: CustomerIncidentView = {
  id: "IN2",
  bookingId: "BK-IN2",
  category: INCIDENT_CATEGORY.HORSE_HEALTH,
  severity: INCIDENT_SEVERITY.CRITICAL,
  status: INCIDENT_STATUS.PENDING,
  title: "Horse requires veterinary attention",
  description: "The horse is receiving immediate veterinary attention.",
  reportedAt: "2026-10-20T09:00:00Z",
  lastUpdatedAt: "2026-10-20T09:45:00Z",
  costsHidden: true,
  contactPhoneHidden: true,
};
export const incidentMocks = {
  summaries: incidentMockSummaries,
  details: incidentMockDetails,
  customer: incidentMockCustomer,
  pendingCost,
} as const;

export const incidentRequestMocks: {
  vehicle: VehicleIncidentRequest;
  horseHealth: HorseHealthIncidentRequest;
  addHorseDetails: AddHorseDetailsRequest;
  supplementVehicle: SupplementVehicleRequest;
  veterinaryOutcome: VeterinaryOutcomeRequest;
  raiseSeverity: RaiseSeverityRequest;
} = {
  vehicle: {
    transportId: "TR-IN1",
    vehicleId: "VH-IN1",
    category: INCIDENT_CATEGORY.VEHICLE,
    incidentType: VEHICLE_INCIDENT_TYPE.ENGINE_FAILURE,
    severity: INCIDENT_SEVERITY.HIGH,
    title: "Engine failure during transport",
    description: "Engine stopped during the current transport.",
    vehicleOperable: false,
    emergencySettlementRequired: false,
    occurredAt: "2026-10-20T08:00:00Z",
    photoFiles: [{ publicId: "upload-vehicle-001" }],
  },
  horseHealth: {
    transportId: "TR-IN2",
    severity: INCIDENT_SEVERITY.CRITICAL,
    emergencySettlementRequired: true,
    occurredAt: "2026-10-20T08:00:00Z",
    horses: [
      {
        horseId: "HR-002",
        incidentType: HORSE_INCIDENT_TYPE.RESPIRATORY_ISSUE,
        conditionDescription:
          "The horse has rapid breathing and visible distress.",
        veterinarianRequired: true,
        isolationRequired: false,
      },
    ],
  },
  addHorseDetails: {
    horses: [
      {
        horseId: "HR-003",
        incidentType: HORSE_INCIDENT_TYPE.STRESS,
        conditionDescription:
          "The horse is restless after the vehicle collision.",
        veterinarianRequired: false,
        isolationRequired: false,
      },
    ],
  },
  supplementVehicle: {
    lastUpdatedAt: "2026-10-20T08:30:00Z",
    repairNote: "Recovery team is on site.",
  },
  veterinaryOutcome: {
    lastUpdatedAt: "2026-10-20T09:00:00Z",
    outcomeNote: "Veterinarian completed the follow-up examination.",
    horseTransportable: false,
  },
  raiseSeverity: {
    lastUpdatedAt: "2026-10-20T08:30:00Z",
    severity: INCIDENT_SEVERITY.CRITICAL,
    reason: "The engine fire risk has increased and the vehicle cannot move.",
  },
};

export const incidentResponseMocks = {
  loading: { status: "loading" as const },
  success: {
    isSuccess: true,
    code: 201,
    message: "Incident created successfully",
    value: incidentMockDetails[0],
  },
  validationError: {
    isSuccess: false,
    code: 400,
    errorCode: "VALIDATION_ERROR",
    message: "The incident request is invalid",
    errors: [{ field: "description", message: "Description is required" }],
  },
  conflictError: {
    isSuccess: false,
    code: 409,
    errorCode: "INCIDENT_MODIFIED",
    message: "The incident was just modified. Please reload the page",
    errors: [],
  },
  offlineError: {
    isSuccess: false,
    code: 0,
    errorCode: "NETWORK_ERROR",
    message: "Unable to reach the incident service",
    errors: [],
  },
} as const;
