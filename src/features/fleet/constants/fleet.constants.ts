import type {
  ManualVehicleStatus,
  ProviderStatus,
  TransportMode,
  VehicleSort,
  VehicleStatus,
} from "@/features/fleet/types"

export const VEHICLE_LIST_PATH = "/vehicles"
export const PROVIDER_LIST_PATH = "/transport-providers"
export const providerDetailPath = (id: string) => `${PROVIDER_LIST_PATH}/${encodeURIComponent(id)}`
export const providerEditPath = (id: string) => `${providerDetailPath(id)}/edit`

export const vehicleDetailPath = (id: string) => `${VEHICLE_LIST_PATH}/${encodeURIComponent(id)}`
export const vehicleEditPath = (id: string) => `${vehicleDetailPath(id)}/edit`

export const TRANSPORT_MODE_LABEL: Record<TransportMode, string> = {
  ROAD: "ROAD (TRUCK & TRAILER)",
  SEA: "SEA (VESSEL)",
  AIR: "AIR (FREIGHT)",
}

export const TRANSPORT_MODE_SHORT: Record<TransportMode, string> = {
  ROAD: "ROAD",
  SEA: "SEA",
  AIR: "AIR",
}

/** Provider "Service Type" column in the design = supportedModes in the contract. */
export const PROVIDER_MODE_LABEL: Record<TransportMode, string> = {
  ROAD: "Road Transport",
  SEA: "Sea Freight",
  AIR: "Air Freight",
}

export const VEHICLE_STATUS_LABEL: Record<VehicleStatus, string> = {
  AVAILABLE: "AVAILABLE",
  ASSIGNED: "ASSIGNED",
  IN_USE: "IN_USE",
  MAINTENANCE: "MAINTENANCE",
  INACTIVE: "INACTIVE",
}

export const MANUAL_STATUS_OPTION_LABEL: Record<ManualVehicleStatus, string> = {
  AVAILABLE: "Available (Ready for assignment)",
  MAINTENANCE: "Maintenance (Scheduled Inspection & Repair)",
  INACTIVE: "Inactive (Out of service)",
}

export const PROVIDER_STATUS_LABEL: Record<ProviderStatus, string> = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
}

export const VEHICLE_SORT_OPTIONS: { value: VehicleSort; label: string }[] = [
  { value: "updatedAt:desc", label: "RECENTLY UPDATED" },
  { value: "updatedAt:asc", label: "OLDEST UPDATED" },
  { value: "vehicleCode:asc", label: "CODE A-Z" },
  { value: "capacityHorses:desc", label: "CAPACITY (HIGH-LOW)" },
]

export const DEFAULT_VEHICLE_SORT: VehicleSort = "updatedAt:desc"

/** Capacity filter = minCapacity (VH1); vehicles hold 2-9 horses (BR-BOOKING-02). */
export const CAPACITY_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "ALL", label: "Any Capacity" },
  { value: "2", label: "2+ horses" },
  { value: "4", label: "4+ horses" },
  { value: "6", label: "6+ horses" },
  { value: "8", label: "8+ horses" },
]

export const VEHICLE_COUNTRY_OPTIONS = ["ALL", "BE", "DE", "FR", "GB", "IE", "IT", "NL", "ES"] as const

export const VEHICLE_CAPACITY_MIN = 2
export const VEHICLE_CAPACITY_MAX = 9

/** vehicle_type is free text in the DB; these are the suggestions offered by the filter. */
export const VEHICLE_TYPE_OPTIONS = [
  "Specialized Transporter",
  "Long Hauler",
  "Enclosed Box Van",
  "Specialized Shuttle",
  "Air Freight Pod",
  "Maritime Container",
  "Semi-Trailer Livestock Transporter",
]

/** Preset equipment tags of the add/edit form; stored inside the single specialEquipment text column. */
export const EQUIPMENT_PRESETS = [
  "AIR SUSPENSION DAMPING",
  "BIOMETRIC THERMAL SENSORS",
  "ANTI-VIBRATION BULKHEADS",
  "24/7 STALL MONITORING CAMERA",
  "MULTI-ZONE CLIMATE CONTROL",
  "AUTOMATIC DRINKING TROUGH",
  "EMERGENCY RESCUE HOIST",
] as const

export const PROVIDER_NOTE_MAX = 500

/** Country codes offered in the provider form (contract: free text, up to 100 chars). */
export const PROVIDER_COUNTRY_OPTIONS = [
  "Austria",
  "Belgium",
  "Denmark",
  "France",
  "Germany",
  "Ireland",
  "Italy",
  "Netherlands",
  "Spain",
  "Sweden",
  "Switzerland",
  "United Kingdom",
]
