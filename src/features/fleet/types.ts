/** Fleet types follow api-contract/flow3.md (sections 3.3, 3.4, 7, 8). IDs are uuid strings. */

export type ApiEnvelope<T> = { isSuccess?: boolean; code?: number; message?: string; value: T }

export const TRANSPORT_MODES = ["ROAD", "SEA", "AIR"] as const
export type TransportMode = (typeof TRANSPORT_MODES)[number]

export const VEHICLE_STATUSES = ["AVAILABLE", "ASSIGNED", "IN_USE", "MAINTENANCE", "INACTIVE"] as const
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number]

/** ASSIGNED / IN_USE are system-managed (UC-46); only these can be set by hand. */
export const MANUAL_VEHICLE_STATUSES = ["AVAILABLE", "MAINTENANCE", "INACTIVE"] as const
export type ManualVehicleStatus = (typeof MANUAL_VEHICLE_STATUSES)[number]

export type ExpiryStatus = "VALID" | "EXPIRING_SOON" | "EXPIRED"

export type VehicleWarning =
  | "REGISTRATION_EXPIRED"
  | "REGISTRATION_EXPIRING_SOON"
  | "INSURANCE_EXPIRED"
  | "INSURANCE_EXPIRING_SOON"

export interface Vehicle {
  vehicleId: string
  vehicleCode: string
  vehicleName: string | null
  transportMode: TransportMode
  licensePlate: string | null
  vehicleType: string | null
  manufacturer: string | null
  model: string | null
  capacityHorses: number
  status: VehicleStatus
  registrationNumber: string | null
  registrationExpiryDate: string | null
  registrationStatus: ExpiryStatus
  insuranceNumber: string | null
  insuranceExpiryDate: string | null
  insuranceStatus: ExpiryStatus
  specialEquipment: string | null
  warnings: VehicleWarning[]
  createdAt: string
  updatedAt: string
}

export interface VehicleAssignment {
  routePlanRouteId: string
  routePlanId: string
  routePlanCode: string
  transportPlanId: string
  planCode: string
  sequenceNo: number
  fromLocationName: string
  toLocationName: string
  plannedDepartureAt: string
  plannedArrivalAt: string
}

export interface VehicleDetail extends Vehicle {
  upcomingAssignments: VehicleAssignment[]
}

export type VehicleSort = "updatedAt:desc" | "updatedAt:asc" | "vehicleCode:asc" | "capacityHorses:desc"

export interface VehicleListParams {
  pageIndex: number
  pageSize: number
  search: string
  transportMode: TransportMode | "ALL"
  status: VehicleStatus | "ALL"
  vehicleType: string
  /** "ALL" = any capacity, otherwise capacityHorses >= value. */
  minCapacity: number | "ALL"
  sortBy: VehicleSort
}

/** POST /vehicles (VH3). status is always AVAILABLE server-side. */
export interface VehiclePayload {
  vehicleCode: string
  vehicleName?: string
  transportMode: TransportMode
  licensePlate?: string
  vehicleType?: string
  manufacturer?: string
  model?: string
  capacityHorses: number
  registrationNumber?: string
  registrationExpiryDate?: string
  insuranceNumber?: string
  insuranceExpiryDate?: string
  specialEquipment?: string
}

/** PUT /vehicles/{id} (VH4): vehicleCode and status are not editable. */
export type VehicleUpdatePayload = Omit<VehiclePayload, "vehicleCode"> & { lastUpdatedAt: string }

export interface VehicleStatusPayload {
  lastUpdatedAt: string
  status: ManualVehicleStatus
  reason: string
}

export interface VehicleStatusResult {
  vehicleId: string
  previousStatus: VehicleStatus
  status: VehicleStatus
  updatedAt: string
}

export const PROVIDER_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const
export type ProviderStatus = (typeof PROVIDER_STATUSES)[number]

export interface Provider {
  transportProviderId: string
  providerCode: string
  providerName: string
  status: ProviderStatus
  supportedModes: TransportMode[]
  taxCode: string | null
  contactName: string | null
  phone: string | null
  email: string | null
  address: string | null
  country: string | null
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface ProviderListParams {
  pageIndex: number
  pageSize: number
  search: string
  supportedMode: TransportMode | "ALL"
  status: ProviderStatus | "ALL"
  sortBy: string
}

/** POST /transport-providers (PV3). */
export interface ProviderPayload {
  providerCode: string
  providerName: string
  supportedModes: TransportMode[]
  taxCode: string
  contactName?: string
  phone?: string
  email?: string
  address?: string
  country?: string
  note?: string
}

/** PUT /transport-providers/{id} (PV4): providerCode is immutable, status uses PV5. */
export type ProviderUpdatePayload = Omit<ProviderPayload, "providerCode"> & { lastUpdatedAt: string }

/** PATCH /transport-providers/{id}/status (PV5). lastUpdatedAt: the BE rejects the call without it (409 PROVIDER_MODIFIED when stale). */
export interface ProviderStatusPayload {
  status: ProviderStatus
  reason?: string
  lastUpdatedAt: string
}

export interface ProviderCounts {
  total: number
  active: number
  inactive: number
  suspended: number
}
