import type { z } from "zod"
import type {
  approvedBookingDetailSchema, approvedBookingListItemSchema, approvedBookingsQuerySchema,
  approvedBookingsPageSchema, depositStatusSchema, routePlanningStatusSchema, transportScopeSchema,
} from "./schemas"

export type TransportScope = z.infer<typeof transportScopeSchema>
export type DepositStatus = z.infer<typeof depositStatusSchema>
export type RoutePlanningStatus = z.infer<typeof routePlanningStatusSchema>
export type ApprovedBookingsQueryParams = z.input<typeof approvedBookingsQuerySchema>
export type ApprovedBookingsPageValue = z.infer<typeof approvedBookingsPageSchema>
export type ApprovedBookingListItem = z.infer<typeof approvedBookingListItemSchema>
export type ApprovedBookingDetail = z.infer<typeof approvedBookingDetailSchema>
