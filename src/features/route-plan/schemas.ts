import { z } from 'zod'
import type { RouteSegmentInput } from './types'

const uuid = z.string().uuid('Must be a valid identifier.')
const dateTime = z.string().datetime({ offset: true, message: 'Must be a valid ISO date-time.' })

export const routeSegmentSchema = z.object({
  sequenceNo: z.number().int().positive(),
  routeId: uuid.optional(),
  fromLocationId: uuid.optional(),
  toLocationId: uuid.optional(),
  transportMode: z.enum(['ROAD', 'SEA', 'AIR']).optional(),
  plannedDepartureAt: dateTime,
  plannedArrivalAt: dateTime,
  vehicleIds: z.array(uuid).optional(),
  outsourcing: z.object({
    transportProviderId: uuid,
    note: z.string().trim().max(500).optional(),
  }).optional(),
  note: z.string().trim().max(500).optional(),
}).superRefine((segment, context) => {
  const hasRoute = Boolean(segment.routeId)
  const hasManualRoute = Boolean(segment.fromLocationId && segment.toLocationId && segment.transportMode)
  if (!hasRoute && !hasManualRoute) {
    context.addIssue({ code: 'custom', path: ['routeId'], message: 'Select a route or provide origin, destination and mode.' })
  }
  if (new Date(segment.plannedArrivalAt) <= new Date(segment.plannedDepartureAt)) {
    context.addIssue({ code: 'custom', path: ['plannedArrivalAt'], message: 'Arrival must be after departure.' })
  }
  if (segment.outsourcing && segment.vehicleIds?.length) {
    context.addIssue({ code: 'custom', path: ['vehicleIds'], message: 'Outsourced segments cannot have vehicles.' })
  }
})

const action = z.enum(['SAVE_DRAFT', 'SUBMIT_FOR_LEGAL_REVIEW'])

export const createRoutePlanSchema = z.object({
  routeType: z.enum(['PRIMARY', 'BACKUP']),
  segments: z.array(routeSegmentSchema).min(1, 'Add at least one segment.'),
  routeNote: z.string().trim().max(2000).optional(),
  action,
}).superRefine((value, context) => {
  if (value.routeType === 'BACKUP' && !value.routeNote?.trim()) {
    context.addIssue({ code: 'custom', path: ['routeNote'], message: 'A reason is required for a backup route.' })
  }
  validateSequence(value.segments, context)
})

export const updateRoutePlanSchema = z.object({
  lastUpdatedAt: dateTime,
  updateReason: z.string().trim().min(1, 'Update reason is required.').max(2000),
  segments: z.array(routeSegmentSchema).min(1, 'Add at least one segment.'),
  routeNote: z.string().trim().max(2000).optional(),
  action,
}).superRefine((value, context) => validateSequence(value.segments, context))

export const cancelRoutePlanSchema = z.object({
  lastUpdatedAt: dateTime,
  reason: z.string().trim().min(1, 'Cancellation reason is required.').max(2000),
})

export const legalReviewSchema = z.object({
  lastUpdatedAt: dateTime,
  isFeasible: z.boolean(),
  note: z.string().trim().max(2000).optional(),
  blockedSegments: z.array(z.number().int().positive()).optional(),
}).superRefine((value, context) => {
  if (!value.isFeasible && !value.note?.trim()) {
    context.addIssue({ code: 'custom', path: ['note'], message: 'A note is required when the route is not feasible.' })
  }
})

function validateSequence(segments: RouteSegmentInput[], context: z.RefinementCtx) {
  segments.forEach((segment, index) => {
    if (segment.sequenceNo !== index + 1) {
      context.addIssue({ code: 'custom', path: ['segments', index, 'sequenceNo'], message: 'Sequence must be continuous from 1.' })
    }
  })
}

export type RouteSegmentFormValues = z.infer<typeof routeSegmentSchema>
export type CreateRoutePlanFormValues = z.infer<typeof createRoutePlanSchema>
export type UpdateRoutePlanFormValues = z.infer<typeof updateRoutePlanSchema>
export type CancelRoutePlanFormValues = z.infer<typeof cancelRoutePlanSchema>
export type LegalReviewFormValues = z.infer<typeof legalReviewSchema>
