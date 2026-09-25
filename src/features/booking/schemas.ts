import { z } from "zod"

import { BOOKING_STATUSES } from "@/features/booking/types"

const optionalText = (max: number) => z.string().trim().max(max)

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
  .refine(
    (values) =>
      !values.requestedArrivalDate ||
      !values.requestedDepartureDate ||
      values.requestedArrivalDate >= values.requestedDepartureDate,
    { message: "Arrival date cannot be before departure", path: ["requestedArrivalDate"] },
  )

export const reasonSchema = z.object({
  reason: z.string().trim().min(10, "Please provide at least 10 characters").max(500),
})

export const cancelBookingSchema = reasonSchema
export const rejectBookingSchema = reasonSchema

export type BookingFiltersFormValues = z.infer<typeof bookingFiltersSchema>
export type BookingFormSchemaValues = z.infer<typeof bookingFormSchema>
export type CancelBookingFormValues = z.infer<typeof cancelBookingSchema>
export type RejectBookingFormValues = z.infer<typeof rejectBookingSchema>
