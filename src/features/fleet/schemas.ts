import { z } from "zod"

import { PROVIDER_NOTE_MAX, VEHICLE_CAPACITY_MAX, VEHICLE_CAPACITY_MIN } from "@/features/fleet/constants/fleet.constants"
import { MANUAL_VEHICLE_STATUSES, TRANSPORT_MODES } from "@/features/fleet/types"
import { todayIso } from "@/features/fleet/utils"

const optionalText = (max: number, label: string) => z.string().trim().max(max, `${label} must be at most ${max} characters.`)

/** Expiry dates are optional but, when given, must be in the future (UC-44 EXC-03). */
const futureDate = (label: string) =>
  z
    .string()
    .refine((value) => !value || value > todayIso(), `${label} must be in the future.`)

export const vehicleFormSchema = z
  .object({
    vehicleCode: z.string().trim().min(1, "Vehicle code is required.").max(50, "Vehicle code must be at most 50 characters."),
    vehicleName: optionalText(200, "Vehicle name"),
    transportMode: z.enum(TRANSPORT_MODES),
    licensePlate: optionalText(50, "License plate"),
    vehicleType: optionalText(100, "Vehicle type"),
    manufacturer: optionalText(100, "Manufacturer"),
    model: optionalText(100, "Series / model"),
    capacityHorses: z
      .number({ message: "Capacity is required." })
      .int("Capacity must be a whole number.")
      .min(VEHICLE_CAPACITY_MIN, `Vehicle capacity must be between ${VEHICLE_CAPACITY_MIN} and ${VEHICLE_CAPACITY_MAX} racehorses (BR-BOOKING-02).`)
      .max(VEHICLE_CAPACITY_MAX, `Vehicle capacity must be between ${VEHICLE_CAPACITY_MIN} and ${VEHICLE_CAPACITY_MAX} racehorses (BR-BOOKING-02).`),
    registrationNumber: optionalText(100, "Inspection certificate no."),
    registrationExpiryDate: futureDate("Inspection expiration date"),
    insuranceNumber: optionalText(100, "Insurance policy no."),
    insuranceExpiryDate: futureDate("Insurance expiration date"),
    equipmentTags: z.array(z.string()),
    equipmentNotes: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.transportMode === "ROAD" && !values.licensePlate.trim()) {
      ctx.addIssue({ code: "custom", path: ["licensePlate"], message: "License plate is required for road vehicles." })
    }
  })

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>

export const vehicleStatusSchema = z.object({
  status: z.enum(MANUAL_VEHICLE_STATUSES, { message: "Select a new status." }),
  reason: z.string().trim().min(1, "A reason is required.").max(500, "Reason must be at most 500 characters."),
})

export type VehicleStatusFormValues = z.infer<typeof vehicleStatusSchema>

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const providerFormSchema = z.object({
  providerCode: z.string().trim().min(1, "Provider code is required.").max(50, "Provider code must be at most 50 characters."),
  providerName: z.string().trim().min(1, "Provider name is required.").max(200, "Provider name must be at most 200 characters."),
  taxCode: z.string().trim().min(1, "Tax code / VAT number is required.").max(100, "Tax code must be at most 100 characters."),
  supportedModes: z.array(z.enum(TRANSPORT_MODES)).min(1, "Select at least one service type."),
  contactName: optionalText(150, "Business representative"),
  phone: optionalText(30, "Hotline"),
  email: z.string().trim().max(255, "Email must be at most 255 characters.").refine((value) => !value || emailPattern.test(value), "Enter a valid email address."),
  address: optionalText(500, "Address"),
  country: optionalText(100, "Country"),
  note: z.string().max(PROVIDER_NOTE_MAX, `Note must be at most ${PROVIDER_NOTE_MAX} characters.`),
})

export type ProviderFormValues = z.infer<typeof providerFormSchema>

export const providerStatusSchema = z
  .object({
    status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
    reason: z.string().trim().max(500, "Reason must be at most 500 characters."),
  })
  .superRefine((values, ctx) => {
    if (values.status !== "ACTIVE" && !values.reason) {
      ctx.addIssue({ code: "custom", path: ["reason"], message: "A reason is required for Inactive or Suspended." })
    }
  })

export type ProviderStatusFormValues = z.infer<typeof providerStatusSchema>
