import type { z } from "zod"
import type { overviewSchema, segmentDetailSchema, segmentsResponseSchema, trackingSnapshotSchema } from "./schemas"

export type TrackingSnapshot = z.infer<typeof trackingSnapshotSchema>
export type TrackingSegment = TrackingSnapshot["plannedRoute"]["segments"][number]
export type TrackingStop = NonNullable<TrackingSnapshot["nextStop"]>
export type TruckSample = NonNullable<TrackingSnapshot["truck"]>

export type SegmentDetail = z.infer<typeof segmentDetailSchema>
export type SegmentsResponse = z.infer<typeof segmentsResponseSchema>
export type TransportOverview = z.infer<typeof overviewSchema>

export type GpsSignal = "LIVE" | "DELAYED" | "LOST"

/** One received sample with its time as a number, ready for comparisons. */
export interface TrailPoint {
  latitude: number
  longitude: number
  recordedAt: string
  time: number
}

/** Strokes of the trail: a new stroke starts after every signal gap, so gaps are never joined by a line. */
export type Trail = TrailPoint[][]

export interface RouteEstimate {
  /** Road distance/time from the vehicle to the next stop (Geoapify routing). */
  nextStopKm: number
  nextStopMinutes: number
  /** Same up to the final destination of the plan, through the remaining stops. */
  destinationKm: number
  destinationMinutes: number
  /** When it was computed (client clock). */
  computedAt: number
}
