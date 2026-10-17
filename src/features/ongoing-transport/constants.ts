export const ONGOING_TRANSPORT_STATUSES = [
  "READY",
  "IN_TRANSIT",
  "COMPLETED",
] as const;
export const ROUTE_TYPES = ["PRIMARY", "BACKUP", "RETURN"] as const;
export const SEGMENT_STATUSES = ["PLANNED", "IN_TRANSIT", "COMPLETED"] as const;
export const DEFAULT_STATUS_FILTER = "READY,IN_TRANSIT";
export const DEFAULT_SORT = "departureAt:asc";
export const DEFAULT_PAGE_SIZE = 20;
export const ONGOING_PAGE_SIZE_OPTIONS = [1, 5, 10, 20, 50, 100];
export const INCIDENT_CATEGORIES = [
  "HORSE_HEALTH",
  "ROUTE_CHANGE",
  "VEHICLE",
  "BOTH",
] as const;
export const DOSSIER_STATUSES = [
  "DRAFT",
  "IN_PREPARATION",
  "READY_FOR_SUBMISSION",
  "SUBMITTED",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CLOSED",
] as const;
export const segmentLabels = {
  PLANNED: "Planned",
  IN_TRANSIT: "In transit",
  COMPLETED: "Completed",
} as const;
export const routeLabels = {
  PRIMARY: "Primary",
  BACKUP: "Backup",
  RETURN: "Return",
} as const;

export const statusOptions = [
  { value: "READY", label: "Ready" },
  { value: "IN_TRANSIT", label: "In transit" },
  { value: "COMPLETED", label: "Completed" },
] as const;

export const sortOptions = [
  { value: "departureAt:asc", label: "Departure: earliest first" },
  { value: "departureAt:desc", label: "Departure: latest first" },
  { value: "transportCode:asc", label: "Transport code: A–Z" },
] as const;

export const initialOngoingTransportParams = {
  search: "",
  status: DEFAULT_STATUS_FILTER,
  hasActiveIncident: undefined,
  pageIndex: 0,
  pageSize: DEFAULT_PAGE_SIZE,
  sortBy: DEFAULT_SORT,
} as const;
