export type RoutePlanStatus = 'DRAFT' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'

export const ROUTE_PLAN_STATUSES = ['DRAFT', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const satisfies readonly RoutePlanStatus[]

export const ROUTE_PLAN_STATUS_LABELS: Record<RoutePlanStatus, string> = {
  DRAFT: 'Draft',
  CONFIRMED: 'Confirmed',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export function canEditRoutePlan(status: RoutePlanStatus): boolean {
  return status === 'DRAFT'
}

export function canCancelRoutePlan(status: RoutePlanStatus): boolean {
  return status === 'DRAFT'
}

export function canSubmitLegalReview(status: RoutePlanStatus): boolean {
  return status === 'DRAFT'
}
