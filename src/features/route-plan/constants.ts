import type { VehicleStatus } from "./types";

export const ROUTE_PLAN_ENDPOINTS = {
  transportPlans: '/transport-plans',
  bookings: '/bookings/approved',
  locations: '/locations',
  routes: '/routes',
  vehicles: '/vehicles',
  providers: '/transport-providers',
  routePlans: '/route-plans',
} as const

export const ROUTE_PLAN_ERROR_MESSAGES: Record<string, string> = {
  SEGMENT_NOT_CONTINUOUS: 'Segments must be continuous.',
  REST_RULE_VIOLATION: 'The route violates mandatory rest rules.',
  VEHICLE_CAPACITY_EXCEEDED: 'Selected vehicles do not have enough capacity.',
  VEHICLE_MODE_MISMATCH: 'Selected vehicle does not match the segment mode.',
  OUTSOURCED_SEGMENT: 'An outsourced segment cannot have vehicles, driver or escort.',
  PROVIDER_MODE_MISMATCH: 'Provider does not support this transport mode.',
  ROUTE_LOCKED: 'This route cannot be changed while transport is in progress.',
  ROUTE_PLAN_MODIFIED: 'Route plan changed. Reload and try again.',
  INCIDENT_REQUIRED: 'An incident is required when changing vehicles mid-trip.',
  INCIDENT_NOT_FOUND: 'The incident could not be found.',
  INVALID_INCIDENT_STATUS: 'The incident can no longer be used for a vehicle change.',
  VEHICLE_NOT_IN_INCIDENT: 'A removed vehicle is not included in the incident.',
  REPLACEMENT_COST_NOT_APPROVED: 'Replacement vehicle cost must be approved first.',
  TRANSPORT_NOT_IN_TRANSIT: 'The transport is not in transit.',
  INVALID_ROUTE_PLAN_TYPE: 'Only a PRIMARY route plan can be changed before departure.',
  SEGMENT_ALREADY_COMPLETED: 'A selected segment has already been completed.',
  SEGMENT_NOT_IN_ITINERARY: 'A selected segment is not in the active itinerary.',
  SEGMENT_TIMES_MISSING: 'A selected segment is missing departure or arrival times.',
  AMBIGUOUS_REPLACEMENT: 'The replacement is ambiguous across unlisted segments.',
  VEHICLE_UNAVAILABLE: 'The selected vehicle is unavailable.',
  VEHICLE_DOCUMENT_EXPIRED: 'The selected vehicle has expired documents.',
  VEHICLE_SCHEDULE_CONFLICT: 'The selected vehicle has a schedule conflict.',
  VEHICLE_NOT_FOUND: 'The selected vehicle could not be found.',
  DOSSIER_LOCKED: 'The compliance dossier no longer allows a backup route.',
  IDENTICAL_CONTINGENCY_ROUTE: 'Backup route must differ from the primary route.',
  BCP_REQUIRED: 'A cross-border transport requires at least one border control point (BCP).',
  MAP_PROVIDER_ERROR: 'Map provider could not find a suitable road for one of the locations.',
}

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  AVAILABLE: "Available",
  ASSIGNED: "Assigned",
  IN_USE: "In use",
  MAINTENANCE: "Maintenance",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
  OUT_OF_SERVICE: "Out of service",
};
