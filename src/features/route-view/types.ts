import type { z } from "zod"
import type { routePlanDetailSchema, routePlanSummarySchema, routePlansQuerySchema, routeSegmentSchema, routeLegalReviewSchema, routeLocationSchema } from "./schemas"
import type { backupChangeRequestSchema, routeChangeDecisionSchema, returnActivationSchema, driverNoticeSchema,
  backupChangeRequestResultSchema, routeChangeDecisionResultSchema, returnActivationResultSchema, driverNoticeResultSchema } from "./schemas"

export type RoutePlanDetail = z.infer<typeof routePlanDetailSchema>
export type RoutePlanSummary = z.infer<typeof routePlanSummarySchema>
export type RoutePlansQuery = z.infer<typeof routePlansQuerySchema>
export type RouteSegment = z.infer<typeof routeSegmentSchema>
export type RouteLegalReviewData = z.infer<typeof routeLegalReviewSchema>
export type RouteLocation = z.infer<typeof routeLocationSchema>

export type { MapLocation as RouteMapLocation, MapViewerProps as RouteMapViewerProps } from "@/shared/components/map"
export type RouteDetailPath = (routePlanId: string) => string

export type EmergencyRequestMap = {
  request: z.infer<typeof backupChangeRequestSchema>
  decision: z.infer<typeof routeChangeDecisionSchema>
  activation: z.infer<typeof returnActivationSchema>
  notice: z.infer<typeof driverNoticeSchema>
}
export type EmergencyResultMap = {
  request: z.infer<typeof backupChangeRequestResultSchema>
  decision: z.infer<typeof routeChangeDecisionResultSchema>
  activation: z.infer<typeof returnActivationResultSchema>
  notice: z.infer<typeof driverNoticeResultSchema>
}
export type EmergencyAction = keyof EmergencyRequestMap
