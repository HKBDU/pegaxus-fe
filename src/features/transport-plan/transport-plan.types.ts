import type { z } from "zod"
import type { createTransportPlanSchema, updateTransportPlanSchema, employeeBriefSchema, transportPlanDetailSchema, transportPlanListItemSchema, transportPlanQuotationSchema, transportPlansQuerySchema, transportPlanStatusSchema } from "./transport-plan.schemas"

export type TransportPlanStatus = z.infer<typeof transportPlanStatusSchema>
export type TransportPlansQueryParams = z.input<typeof transportPlansQuerySchema>
export type TransportPlanListItem = z.infer<typeof transportPlanListItemSchema>
export type TransportPlanDetail = z.infer<typeof transportPlanDetailSchema>
export type TransportPlanQuotation = z.infer<typeof transportPlanQuotationSchema>
export type EmployeeBrief = z.infer<typeof employeeBriefSchema>
export type CreateTransportPlanInput = z.infer<typeof createTransportPlanSchema>
export type UpdateTransportPlanInput = z.infer<typeof updateTransportPlanSchema>
