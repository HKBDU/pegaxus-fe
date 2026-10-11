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
  DOSSIER_LOCKED: 'The compliance dossier no longer allows a backup route.',
  IDENTICAL_CONTINGENCY_ROUTE: 'Backup route must differ from the primary route.',
}
