import { z } from "zod"
import { canAccess } from "@/features/auth/access-control"
import type { AuthPrincipal } from "@/features/auth/types"
import type { TransportPlanDetail, UpdateTransportPlanInput } from "./transport-plan.types"
import { createTransportPlanSchema, updateTransportPlanSchema } from "./transport-plan.schemas"

export const emptyPlanForm = { plannedStartAt: "", plannedEndAt: "", estimatedDistanceKm: "", estimatedDurationMinutes: "", planningNote: "", updateReason: "" }
export type TransportPlanFormValues = typeof emptyPlanForm
function validLocalDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(value)) return false
  const date = new Date(value)
  // Also reject invalid dates and nonexistent local times (e.g. a DST clock jump).
  return Number.isFinite(date.getTime()) && toLocalDateTime(date.toISOString()).slice(0, value.length) === value
}
const localDate = z.string().refine(validLocalDate, "Enter a valid date and time.")
const optionalNumber = z.string().refine((value) => !value.trim() || (Number.isFinite(Number(value)) && Number(value) >= 0), "Enter a non-negative number.")
const optionalWholeNumber = z.string().refine((value) => !value.trim() || (Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 2_147_483_647), "Enter whole minutes between 0 and 2,147,483,647.")
const formFields = {
  plannedStartAt: localDate, plannedEndAt: localDate,
  estimatedDistanceKm: optionalNumber, estimatedDurationMinutes: optionalWholeNumber,
  planningNote: z.string(), updateReason: z.string(),
}
export const transportPlanFormSchema = z.object(formFields).refine(
  ({ plannedStartAt, plannedEndAt }) => new Date(plannedEndAt) > new Date(plannedStartAt),
  { message: "Planned end must be after planned start.", path: ["plannedEndAt"] },
)
export const editTransportPlanFormSchema = z.object({ ...formFields,
  plannedStartAt: z.union([localDate, z.literal("")]), plannedEndAt: z.union([localDate, z.literal("")]),
}).refine(({ plannedStartAt, plannedEndAt }) => !plannedStartAt || !plannedEndAt || new Date(plannedEndAt) > new Date(plannedStartAt),
  { message: "Planned end must be after planned start.", path: ["plannedEndAt"] })

export function toLocalDateTime(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  const pad = (number: number, length = 2) => String(number).padStart(length, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`
}
export function planToForm(plan: TransportPlanDetail): TransportPlanFormValues {
  return { plannedStartAt: toLocalDateTime(plan.plannedStartAt), plannedEndAt: toLocalDateTime(plan.plannedEndAt),
    estimatedDistanceKm: plan.estimatedDistanceKm == null ? "" : String(plan.estimatedDistanceKm),
    estimatedDurationMinutes: plan.estimatedDurationMinutes == null ? "" : String(plan.estimatedDurationMinutes),
    planningNote: plan.planningNote ?? "", updateReason: "" }
}
export function buildCreatePlanInput(values: TransportPlanFormValues) {
  const valid = transportPlanFormSchema.parse(values)
  return createTransportPlanSchema.parse({ plannedStartAt: new Date(valid.plannedStartAt).toISOString(), plannedEndAt: new Date(valid.plannedEndAt).toISOString(),
    ...(valid.estimatedDistanceKm.trim() ? { estimatedDistanceKm: Number(valid.estimatedDistanceKm) } : {}),
    ...(valid.estimatedDurationMinutes.trim() ? { estimatedDurationMinutes: Number(valid.estimatedDurationMinutes) } : {}),
    ...(valid.planningNote.trim() ? { planningNote: valid.planningNote.trim() } : {}) })
}
export function buildUpdatePlanInput(values: TransportPlanFormValues, plan: TransportPlanDetail) {
  const valid = editTransportPlanFormSchema.parse(values)
  const original = planToForm(plan)
  const input: UpdateTransportPlanInput = { lastUpdatedAt: plan.updatedAt }
  if (valid.plannedStartAt && valid.plannedStartAt !== original.plannedStartAt) input.plannedStartAt = new Date(valid.plannedStartAt).toISOString()
  if (valid.plannedEndAt && valid.plannedEndAt !== original.plannedEndAt) input.plannedEndAt = new Date(valid.plannedEndAt).toISOString()
  const start = input.plannedStartAt ?? plan.plannedStartAt
  const end = input.plannedEndAt ?? plan.plannedEndAt
  if (start && end && Date.parse(end) <= Date.parse(start)) throw new z.ZodError([{ code: "custom", path: ["plannedEndAt"], message: "Planned end must be after planned start." }])
  if (valid.estimatedDistanceKm.trim() && Number(valid.estimatedDistanceKm) !== plan.estimatedDistanceKm) input.estimatedDistanceKm = Number(valid.estimatedDistanceKm)
  if (valid.estimatedDurationMinutes.trim() && Number(valid.estimatedDurationMinutes) !== plan.estimatedDurationMinutes) input.estimatedDurationMinutes = Number(valid.estimatedDurationMinutes)
  if (valid.planningNote.trim() !== original.planningNote.trim()) input.planningNote = valid.planningNote.trim()
  if (valid.updateReason.trim()) input.updateReason = valid.updateReason.trim()
  return updateTransportPlanSchema.parse(input)
}
export function canEditTransportPlan(principal: AuthPrincipal | null, plan: Pick<TransportPlanDetail, "status" | "transport">) {
  return canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] }) && ["DRAFT", "PENDING", "APPROVED"].includes(plan.status) &&
    !["IN_TRANSIT", "COMPLETED", "CANCELLED"].includes(plan.transport.status)
}
