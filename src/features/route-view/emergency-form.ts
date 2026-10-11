import { z } from "zod"
import { transportPlanFormSchema } from "@/features/transport-plan/schemas"
import { backupChangeRequestSchema } from "./schemas"

export const backupRequestDefaults = { reason: "", newEstimatedArrivalAt: "", estimatedExtraCost: "", currency: "", note: "" }
export type BackupRequestValues = typeof backupRequestDefaults
const eta = transportPlanFormSchema.shape.plannedStartAt
const validCost = (value: string) => {
  if (!value.trim()) return true
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0 && amount <= 9_999_999_999_999_998 && Number(amount.toFixed(2)) === amount
}
export const backupRequestFormSchema = z.object({
  reason: z.string().max(4000).trim().min(10, "Explain the change in at least 10 characters."),
  newEstimatedArrivalAt: eta,
  estimatedExtraCost: z.string().refine(validCost, "Enter a non-negative amount with no more than two decimal places."),
  currency: z.string().max(3).trim().refine(value => !value || /^[A-Z]{3}$/.test(value), "Enter a three-letter uppercase ISO currency code."),
  note: z.string().max(4000),
}).refine(values => !values.estimatedExtraCost.trim() || Boolean(values.currency.trim()), { path: ["currency"], message: "Enter a currency for the estimated cost." })
export function buildBackupRequest(values: BackupRequestValues) {
  const valid = backupRequestFormSchema.parse(values)
  return backupChangeRequestSchema.parse({ ...valid, newEstimatedArrivalAt: new Date(valid.newEstimatedArrivalAt).toISOString(),
    estimatedExtraCost: valid.estimatedExtraCost.trim() ? Number(valid.estimatedExtraCost) : undefined,
    currency: valid.estimatedExtraCost.trim() ? valid.currency.trim() : undefined })
}
