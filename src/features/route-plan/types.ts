import type { RoutePlanStatus } from "@/shared/constants/route-plan-status";

export type { RoutePlanStatus };
export type RouteType = "PRIMARY" | "BACKUP" | "RETURN";
export type TransportMode = "ROAD" | "SEA" | "AIR";
export type SegmentStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";
export type ProviderStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type VehicleStatus =
  "AVAILABLE" | "ASSIGNED" | "MAINTENANCE" | "INACTIVE";
export type RoutePlanAction = "SAVE_DRAFT" | "SUBMIT_FOR_LEGAL_REVIEW";
export type LocationType =
  | "CITY"
  | "BORDER_GATE"
  | "AIRPORT"
  | "SEAPORT"
  | "STABLE"
  | "REST_STOP"
  | "OTHER";
export type RegistrationStatus = "VALID" | "EXPIRING_SOON" | "EXPIRED";

export interface EmployeeBrief {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  role: string;
}

export interface LocationBrief {
  locationId: string;
  locationName: string;
  locationType: LocationType | null;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
}

export interface RouteBrief {
  routeId: string;
  routeCode: string;
  routeName: string;
  transportMode: TransportMode;
  distanceKm: number;
  estimatedDurationMinutes: number;
}

export interface VehicleBrief {
  vehicleId: string;
  vehicleCode: string;
  vehicleName: string;
  licensePlate: string | null;
  transportMode: TransportMode;
  capacityHorses: number;
}

export interface Vehicle extends VehicleBrief {
  vehicleType: string | null;
  manufacturer: string | null;
  model: string | null;
  status: VehicleStatus;
  registrationNumber: string | null;
  registrationExpiryDate: string | null;
  registrationStatus: RegistrationStatus | null;
  insuranceNumber: string | null;
  insuranceExpiryDate: string | null;
  insuranceStatus: RegistrationStatus | null;
  specialEquipment: string | null;
  warnings: string[];
  isAvailable?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Provider {
  transportProviderId: string;
  providerCode: string;
  providerName: string;
  status: ProviderStatus;
  supportedModes: TransportMode[];
  taxCode: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  country: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Outsourcing {
  provider: Provider;
}

export interface RouteSegment {
  routePlanRouteId: string;
  sequenceNo: number;
  routeType: RouteType;
  route: RouteBrief;
  fromLocation: LocationBrief;
  toLocation: LocationBrief;
  plannedDepartureAt: string;
  plannedArrivalAt: string;
  actualDepartureAt: string | null;
  actualArrivalAt: string | null;
  status: SegmentStatus;
  dwellAfterMinutes: number | null;
  isOutsourced: boolean;
  vehicles: VehicleBrief[];
  outsourcing: Outsourcing | null;
  driver: EmployeeBrief | null;
  escort: EmployeeBrief | null;
  note: string | null;
}

export interface LegalReview {
  isFeasible: boolean;
  note: string | null;
  blockedSegments: number[];
  reviewedBy: EmployeeBrief | null;
  reviewedAt: string | null;
}

export interface RoutePlan {
  routePlanId: string;
  routePlanCode: string;
  transportPlanId: string;
  bookingId: string;
  bookingCode: string;
  routeType: RouteType;
  status: RoutePlanStatus;
  isCrossBorder: boolean;
  totalDistanceKm: number;
  estimatedDurationMinutes: number;
  plannedDepartureAt: string;
  plannedArrivalAt: string;
  segments: RouteSegment[];
  isPersonnelComplete: boolean;
  legalReview: LegalReview | null;
  routeNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RouteSegmentInput {
  sequenceNo: number;
  routeId?: string;
  fromLocationId?: string;
  toLocationId?: string;
  transportMode?: TransportMode;
  plannedDepartureAt: string;
  plannedArrivalAt: string;
  vehicleIds?: string[];
  outsourcing?: { transportProviderId: string; note?: string };
  note?: string;
}

export interface CreateRoutePlanRequest {
  routeType: "PRIMARY" | "BACKUP";
  segments: RouteSegmentInput[];
  routeNote?: string;
  action: RoutePlanAction;
}

export interface UpdateRoutePlanRequest {
  lastUpdatedAt: string;
  updateReason: string;
  segments: RouteSegmentInput[];
  routeNote?: string;
  action: RoutePlanAction;
}

export interface CancelRoutePlanRequest {
  lastUpdatedAt: string;
  reason: string;
}

export interface LegalReviewRequest {
  lastUpdatedAt: string;
  isFeasible: boolean;
  note?: string;
  blockedSegments?: number[];
}

export interface OutsourceSegmentRequest {
  outsourced: boolean;
  transportProviderId?: string;
  note?: string;
}

export interface OutsourceSegmentResult {
  routePlanId: string;
  segment: RouteSegment;
  isPersonnelComplete: boolean;
  updatedAt: string;
}

export interface RoutePlanMutationResult {
  routePlanId: string;
  status: RoutePlanStatus;
  totalDistanceKm?: number;
  estimatedDurationMinutes?: number;
  segmentCount?: number;
  isPersonnelComplete?: boolean;
  cancelledAt?: string;
  bookingStatus?: string;
  updatedAt: string;
}

export interface LegalReviewResult extends RoutePlanMutationResult {
  legalReview: LegalReview;
  customerUploadEnabled: boolean;
  personnelAssignmentPhase2Enabled: boolean;
}

export interface RoutePlanListParams {
  routeType?: RouteType;
  pageIndex?: number;
  pageSize?: number;
}

export interface MasterListParams {
  pageIndex?: number;
  pageSize?: number;
  search?: string;
}

export interface LocationListParams extends MasterListParams {
  country?: string;
  locationType?: LocationType;
}

export interface RouteListParams extends MasterListParams {
  fromLocationId?: string;
  toLocationId?: string;
  transportMode?: TransportMode;
}

export interface VehicleListParams extends MasterListParams {
  transportMode?: TransportMode;
  status?: VehicleStatus;
  vehicleType?: string;
  minCapacity?: number;
  availableFrom?: string;
  availableTo?: string;
}

export interface ProviderListParams extends MasterListParams {
  status?: ProviderStatus;
  supportedMode?: TransportMode;
}

export interface Location extends LocationBrief {
  address: string | null;
  stateProvince: string | null;
  locationNote: string | null;
  updatedAt: string;
}

export interface RouteMaster extends RouteBrief {
  fromLocation: LocationBrief;
  toLocation: LocationBrief;
  routeNote: string | null;
  updatedAt: string;
}

export interface PaginatedValue<T> {
  items: T[];
  pageIndex: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiEnvelope<T> {
  isSuccess: boolean;
  code: number;
  message: string;
  value: T;
}
