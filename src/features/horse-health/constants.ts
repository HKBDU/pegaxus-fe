export const HORSE_HEALTH_ROUTES = {
  home: "/crew",
  transports: "/crew/transports",
  transportDetail: (transportId: string) => `/crew/transports/${encodeURIComponent(transportId)}`,
  handovers: (transportId: string) => `/crew/transports/${encodeURIComponent(transportId)}/handovers`,
  quarantine: (dossierId: string) => `/compliance-dossiers/${encodeURIComponent(dossierId)}/bcp-quarantine-proof`,
  clearance: (dossierId: string) => `/compliance-dossiers/${encodeURIComponent(dossierId)}/customs-clearance-proof`,
  health: (transportId: string) => `/crew/transports/${encodeURIComponent(transportId)}/health`,
  history: (transportId: string, horseId: string) => `/crew/transports/${encodeURIComponent(transportId)}/health/${encodeURIComponent(horseId)}`,
} as const

export const LOG_TYPES = ["PRE_TRIP_CHECK", "ROUTINE_CHECK", "BORDER_CHECK", "REST_STOP_CHECK", "INCIDENT_FOLLOWUP", "POST_TRIP_CHECK", "OTHER"] as const
export const HEALTH_STATUSES = ["NORMAL", "OBSERVATION_REQUIRED", "AT_RISK", "CRITICAL"] as const
export const HYDRATION_STATUSES = ["NORMAL", "MILD_DEHYDRATION", "MODERATE_DEHYDRATION", "SEVERE_DEHYDRATION"] as const
export const MAX_PHOTOS = 1

export const HEALTH_STATUS_LABELS: Record<(typeof HEALTH_STATUSES)[number], string> = {
  NORMAL: "Normal",
  OBSERVATION_REQUIRED: "Observation required",
  AT_RISK: "At risk",
  CRITICAL: "Critical",
}

export const HEALTH_STATUS_TONES = {
  NORMAL: "success",
  OBSERVATION_REQUIRED: "warning",
  AT_RISK: "orange",
  CRITICAL: "danger",
} as const

export const CREW_ACTION_LABELS = {
  quarantine: "Quarantine Documents",
  clearance: "Customs Clearance",
  handover: "Handover",
  incident: "Emergency Incident",
  notifications: "Notifications",
  gps: "Turn On GPS",
  viewTransport: "Transport Plan Details",
  health: "Record Horse Status",
} as const
