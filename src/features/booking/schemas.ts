import { z } from "zod"
import { addDays, addMonths, format, parseISO } from "date-fns"

import { BOOKING_STATUSES } from "@/features/booking/types"

const optionalText = (max: number) => z.string().trim().max(max)

const DATE_FORMAT = "yyyy-MM-dd"

export function getBookingDepartureDateRange(now = new Date()) {
  const utcToday = parseISO(now.toISOString().slice(0, 10))

  return {
    minDate: format(addDays(utcToday, 21), DATE_FORMAT),
    maxDate: format(addMonths(utcToday, 2), DATE_FORMAT),
  }
}

export const bookingFiltersSchema = z.object({
  search: z.string().trim().max(100, "Search is limited to 100 characters"),
  status: z.enum(["ALL", ...BOOKING_STATUSES]),
  sortBy: z.enum(["createdAt:desc", "createdAt:asc", "requestedDepartureDate:asc"]),
})

export const bookingFormSchema = z
  .object({
    originAddress: z.string().trim().min(3, "Enter the pickup address").max(500),
    originCountry: z.string().trim().min(2, "Enter the pickup country").max(100),
    destinationAddress: z.string().trim().min(3, "Enter the destination address").max(500),
    destinationCountry: z.string().trim().min(2, "Enter the destination country").max(100),
    requestedDepartureDate: z.string().min(1, "Choose a departure date"),
    requestedArrivalDate: z.string(),
    specialRequirements: optionalText(1000),
    customerNote: optionalText(1000),
    horses: z
      .array(
        z.object({
          horseId: z.union([z.string().min(1), z.number().int().positive()]),
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
    if (values.requestedDepartureDate) {
      const { minDate, maxDate } = getBookingDepartureDateRange()
      if (values.requestedDepartureDate < minDate || values.requestedDepartureDate > maxDate) {
        context.addIssue({
          code: "custom",
          message: "Departure date must be between 3 weeks and 2 months from today",
          path: ["requestedDepartureDate"],
        })
      }
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
