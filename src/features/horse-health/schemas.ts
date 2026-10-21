import { z } from "zod"

import { HEALTH_STATUSES, HYDRATION_STATUSES, LOG_TYPES } from "./constants"

const id = z.string()
const nullableText = z.string().nullable()
const timestamp = z.string().datetime({ offset: true })

export const logTypeSchema = z.enum(LOG_TYPES)
export const healthStatusSchema = z.enum(HEALTH_STATUSES)
export const hydrationStatusSchema = z.enum(HYDRATION_STATUSES)

export const crewMemberSchema = z.object({
  employeeId: id,
  employeeCode: z.string().nullable().optional(),
  fullName: z.string(),
  role: z.string(),
  phone: z.string().nullable().optional(),
})

export const horseBriefSchema = z.object({
  horseId: id,
  horseName: z.string(),
  microchipNumber: nullableText,
  passportNumber: nullableText.optional(),
})

export const healthPhotoSchema = z.object({
  photoUrl: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  capturedAt: timestamp.nullable(),
  caption: z.string().nullable(),
})

export const healthLogSummarySchema = z.object({
  horseHealthLogId: id,
  horse: horseBriefSchema,
  checkedAt: timestamp,
  logType: logTypeSchema,
  healthStatus: healthStatusSchema,
  hydrationStatus: hydrationStatusSchema.nullable(),
  checkedBy: crewMemberSchema,
  veterinarianRequired: z.boolean(),
  hasPhoto: z.boolean(),
  latestNote: z.string().nullable().optional(),
  locationDescription: z.string().nullable().optional(),
})

export const healthLogSchema = healthLogSummarySchema.extend({
  transportId: id,
  temperatureCelsius: z.number().nullable(),
  heartRateBpm: z.number().nullable(),
  respiratoryRateBpm: z.number().nullable(),
  behaviorNote: nullableText,
  symptomNote: nullableText,
  injuryNote: nullableText,
  feedingNote: nullableText,
  hydrationNote: nullableText,
  treatmentProvided: nullableText,
  medicationGiven: nullableText,
  veterinarianNote: nullableText,
  locationDescription: nullableText,
  gpsCoordinates: z.object({ latitude: z.number(), longitude: z.number() }).nullable(),
  photos: z.array(healthPhotoSchema),
  generalNote: nullableText,
  createdAt: timestamp,
  updatedAt: timestamp,
})

export const horseHealthOverviewItemSchema = z.object({
  horse: horseBriefSchema,
  latestHealthStatus: healthStatusSchema.nullable(),
  latestLog: healthLogSummarySchema.nullable(),
  logCount: z.number().int().nonnegative(),
})

export const horseHealthOverviewSchema = z.object({
  serverTime: timestamp,
  transportId: id,
  transportStatus: z.string(),
  currentEscort: crewMemberSchema.nullable(),
  horses: z.array(horseHealthOverviewItemSchema),
})

export const healthLogHistorySchema = z.object({
  serverTime: timestamp,
  horse: horseBriefSchema,
  items: z.array(healthLogSummarySchema),
  pageIndex: z.number().int().nonnegative(),
  pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
})

export const healthLogInputSchema = z.object({
  horseId: id,
  logType: logTypeSchema,
  healthStatus: healthStatusSchema,
  hydrationStatus: hydrationStatusSchema,
  checkedAt: timestamp.optional(),
  temperatureCelsius: z.number().nullable().optional(),
  heartRateBpm: z.number().int().nullable().optional(),
  respiratoryRateBpm: z.number().int().nullable().optional(),
  behaviorNote: z.string().max(2000).optional(),
  symptomNote: z.string().max(2000).optional(),
  injuryNote: z.string().max(2000).optional(),
  feedingNote: z.string().max(2000).optional(),
  hydrationNote: z.string().max(2000).optional(),
  treatmentProvided: z.string().max(2000).optional(),
  medicationGiven: z.string().max(2000).optional(),
  veterinarianRequired: z.boolean().optional(),
  veterinarianNote: z.string().max(2000).optional(),
  locationDescription: z.string().max(500).optional(),
  generalNote: z.string().max(2000).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  photoCaptions: z.array(z.string()).optional(),
  photoLatitudes: z.array(z.number()).optional(),
  photoLongitudes: z.array(z.number()).optional(),
  photoCapturedAts: z.array(timestamp).optional(),
  files: z.array(z.instanceof(File)).max(1).optional(),
})

export const markAllNormalInputSchema = z.object({
  logType: logTypeSchema,
  checkedAt: timestamp.optional(),
  locationDescription: z.string().max(500).optional(),
  generalNote: z.string().max(2000).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  files: z.array(z.instanceof(File)).max(1).optional(),
})
