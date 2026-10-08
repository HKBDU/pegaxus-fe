import type { z } from "zod"
import type { employeeBriefSchema, transportPlanAssignmentsSchema, transportPlanDetailSchema, transportPlanListItemSchema, transportPlanQuotationSchema, transportPlansQuerySchema, transportPlanStatusSchema } from "./transport-plan.schemas"

export type TransportPlanStatus = z.infer<typeof transportPlanStatusSchema>
export type TransportPlansQueryParams = z.input<typeof transportPlansQuerySchema>
export type TransportPlanListItem = z.infer<typeof transportPlanListItemSchema>
export type TransportPlanDetail = z.infer<typeof transportPlanDetailSchema>
export type TransportPlanQuotation = z.infer<typeof transportPlanQuotationSchema>
export type TransportPlanAssignments = z.infer<typeof transportPlanAssignmentsSchema>
export type EmployeeBrief = z.infer<typeof employeeBriefSchema>
