export type CrewRole = "DRIVER" | "ESCORT"

export interface AssignedTransportSegment {
  routePlanRouteId: string
  displayOrder: number
  fromLocationName: string
  toLocationName: string
  status: string
}

export interface AssignedTransport {
  transportId: string
  transportCode: string
  bookingCode: string
  complianceDossierId?: string | null
  status: "READY" | "IN_TRANSIT" | string
  myRole: CrewRole
  currentSegment: AssignedTransportSegment | null
  horseCount: number
  departureAt: string | null
  etaAt: string | null
}

export interface AssignedTransportsResponse {
  serverTime: string
  items: AssignedTransport[]
}

export type LogType = "PRE_TRIP_CHECK" | "ROUTINE_CHECK" | "BORDER_CHECK" | "REST_STOP_CHECK" | "INCIDENT_FOLLOWUP" | "POST_TRIP_CHECK" | "OTHER"
export type HealthStatus = "NORMAL" | "OBSERVATION_REQUIRED" | "AT_RISK" | "CRITICAL"
export type HydrationStatus = "NORMAL" | "MILD_DEHYDRATION" | "MODERATE_DEHYDRATION" | "SEVERE_DEHYDRATION"

export interface CrewMember {
  employeeId: string
  employeeCode?: string | null
  fullName: string
  role: string
  phone?: string | null
}

export interface HorseBrief {
  horseId: string
  horseName: string
  microchipNumber: string | null
  passportNumber?: string | null
}

export interface HealthPhoto {
  photoUrl: string
  latitude: number | null
  longitude: number | null
  capturedAt: string | null
  caption: string | null
}

export interface HealthLogSummary {
  horseHealthLogId: string
  horse: HorseBrief
  checkedAt: string
  logType: LogType
  healthStatus: HealthStatus
  hydrationStatus: HydrationStatus | null
  checkedBy: CrewMember
  veterinarianRequired: boolean
  hasPhoto: boolean
  latestNote?: string | null
  locationDescription?: string | null
}

export interface HealthLog extends HealthLogSummary {
  transportId: string
  temperatureCelsius: number | null
  heartRateBpm: number | null
  respiratoryRateBpm: number | null
  behaviorNote: string | null
  symptomNote: string | null
  injuryNote: string | null
  feedingNote: string | null
  hydrationNote: string | null
  treatmentProvided: string | null
  medicationGiven: string | null
  veterinarianNote: string | null
  locationDescription: string | null
  gpsCoordinates: { latitude: number; longitude: number } | null
  photos: HealthPhoto[]
  generalNote: string | null
  createdAt: string
  updatedAt: string
}

export interface HorseHealthOverviewItem {
  horse: HorseBrief
  latestHealthStatus: HealthStatus | null
  latestLog: HealthLogSummary | null
  logCount: number
}

export interface HorseHealthOverview {
  serverTime: string
  transportId: string
  transportStatus: string
  currentEscort: CrewMember | null
  horses: HorseHealthOverviewItem[]
}

export interface HealthLogHistory {
  serverTime: string
  horse: HorseBrief
  items: HealthLogSummary[]
  pageIndex: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface HealthLogInput {
  horseId: string
  logType: LogType
  healthStatus: HealthStatus
  hydrationStatus: HydrationStatus
  checkedAt?: string
  temperatureCelsius?: number | null
  heartRateBpm?: number | null
  respiratoryRateBpm?: number | null
  behaviorNote?: string
  symptomNote?: string
  injuryNote?: string
  feedingNote?: string
  hydrationNote?: string
  treatmentProvided?: string
  medicationGiven?: string
  veterinarianRequired?: boolean
  veterinarianNote?: string
  locationDescription?: string
  generalNote?: string
  latitude?: number
  longitude?: number
  files?: File[]
  photoCaptions?: string[]
  photoLatitudes?: number[]
  photoLongitudes?: number[]
  photoCapturedAts?: string[]
}

export interface MarkAllNormalInput {
  logType: LogType
  checkedAt?: string
  locationDescription?: string
  generalNote?: string
  latitude?: number
  longitude?: number
  files?: File[]
}

export interface ApiErrorShape {
  errorCode?: string
  message?: string
}
