import { z } from "zod"

import { DEPARTURE_TOO_SOON_MESSAGE, SAME_COUNTRY_MESSAGE, getDepartureRule } from "@/features/booking/lib/departure-rule"
import { COUNTRY_MESSAGE, isBookingCountry } from "@/features/booking/lib/place"
import { BOOKING_STATUSES } from "@/features/booking/types"
import { countDecimalPlaces } from "@/shared/constants/validation-limits"

// The BE stores coordinates as decimal(10,4); a missing or out-of-range value is rejected with INVALID_COORDINATES.
const latitudeSchema = (message: string) =>
  z
    .number({ error: message })
    .finite(message)
    .min(-90, message)
    .max(90, message)
    .refine((value) => countDecimalPlaces(value) <= 4, "Latitude must be between -90 and 90 (up to 4 decimal places).")
const longitudeSchema = (message: string) =>
  z
    .number({ error: message })
    .finite(message)
    .min(-180, message)
    .max(180, message)
    .refine((value) => countDecimalPlaces(value) <= 4, "Longitude must be between -180 and 180 (up to 4 decimal places).")

const optionalText = (max: number) => z.string().trim().max(max)

export const bookingIdSchema = z.string()

export const bookingFiltersSchema = z.object({
  search: z.string().trim().max(100, "Search is limited to 100 characters"),
  status: z.enum(["ALL", ...BOOKING_STATUSES]),
  sortBy: z.enum(["createdAt:desc", "createdAt:asc", "requestedDepartureDate:asc"]),
})

export const bookingFormSchema = z
  .object({
    originAddress: z.string().trim().min(3, "Pick the pickup point on the map").max(500),
    originCountry: z.string().trim().min(2, "Pick the pickup point on the map").max(100).refine(isBookingCountry, COUNTRY_MESSAGE),
    originLatitude: latitudeSchema("Pick the pickup point on the map"),
    originLongitude: longitudeSchema("Pick the pickup point on the map"),
    destinationAddress: z.string().trim().min(3, "Pick the destination point on the map").max(500),
    destinationCountry: z.string().trim().min(2, "Pick the destination point on the map").max(100).refine(isBookingCountry, COUNTRY_MESSAGE),
    destinationLatitude: latitudeSchema("Pick the destination point on the map"),
    destinationLongitude: longitudeSchema("Pick the destination point on the map"),
    requestedDepartureDate: z.string().min(1, "Choose a departure date"),
    requestedArrivalDate: z.string(),
    specialRequirements: optionalText(1000),
    customerNote: optionalText(1000),
    horses: z
      .array(
        z.object({
          horseId: z.union([z.string(), z.number()]),
          specialHandlingNotes: optionalText(500),
        }),
      )
      .superRefine((horses, context) => {
        const seen = new Set<string | number>()
        horses.forEach((horse, index) => {
          if (seen.has(horse.horseId)) {
            context.addIssue({
              code: "custom",
              message: "A horse can only be selected once",
              path: [index, "horseId"],
            })
          }
          seen.add(horse.horseId)
        })
      }),
  })
  .superRefine((values, context) => {
    const rule = getDepartureRule(values.originCountry, values.destinationCountry)
    if (rule.kind === "unsupported") {
      context.addIssue({ code: "custom", message: SAME_COUNTRY_MESSAGE, path: ["destinationCountry"] })
    }
    if (values.requestedDepartureDate && values.requestedDepartureDate < rule.minDate) {
      context.addIssue({
        code: "custom",
        message: DEPARTURE_TOO_SOON_MESSAGE[rule.kind],
        path: ["requestedDepartureDate"],
      })
    }

    if (
      values.requestedArrivalDate &&
      values.requestedDepartureDate &&
      values.requestedArrivalDate < values.requestedDepartureDate
    ) {
      context.addIssue({
        code: "custom",
        message: "Arrival date cannot be before departure",
        path: ["requestedArrivalDate"],
      })
    }
  })

export const reasonSchema = z.object({
  reason: z.string().trim().min(10, "Please provide at least 10 characters").max(500),
})

export const cancelBookingSchema = reasonSchema
export const rejectBookingSchema = reasonSchema

export type BookingFiltersFormValues = z.infer<typeof bookingFiltersSchema>
export type BookingFormSchemaValues = z.infer<typeof bookingFormSchema>
export type CancelBookingFormValues = z.infer<typeof cancelBookingSchema>
export type RejectBookingFormValues = z.infer<typeof rejectBookingSchema>
