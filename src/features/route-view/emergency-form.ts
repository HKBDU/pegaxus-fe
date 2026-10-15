import { z } from "zod"
import { transportPlanFormSchema } from "@/features/transport-plan/schemas"
import { backupChangeRequestSchema } from "./schemas"

export const backupRequestDefaults = { reason: "", newEstimatedArrivalAt: "", estimatedExtraCost: "", currency: "VND", note: "" }
export type BackupRequestValues = typeof backupRequestDefaults
const eta = transportPlanFormSchema.shape.plannedStartAt
const validCost = (value: string) => {
  if (!value.trim()) return true
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0 || amount > 9_999_999_999_999_998 || Number(amount.toFixed(2)) !== amount) return false
  // Check the original decimal before Number conversion can silently discard cents.
  const decimal = value.trim().match(/^[+-]?(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:e([+-]?\d+))?$/i)
  if (!decimal) return false
  const fraction = decimal[2] ?? decimal[3] ?? ""
  const digits = `${decimal[1] ?? "0"}${fraction}`.replace(/^0+/, "")
  if (!digits) return true
  const shift = Number(decimal[4] ?? 0) + 2 - fraction.length
  if (!Number.isSafeInteger(shift)) return false
  // At most 18 cents digits fit the existing request range; avoid huge exponent expansion.
  if (shift >= 0 && digits.length + shift > 18) return false
  if (shift < 0 && (-shift >= digits.length || !digits.endsWith("0".repeat(-shift)))) return false
  const cents = shift >= 0 ? digits + "0".repeat(shift) : digits.slice(0, shift)
  return BigInt(cents) === BigInt(amount.toFixed(2).replace(".", ""))
}
export const backupRequestFormSchema = z.object({
  reason: z.string().max(4000).trim().min(10, "Explain the change in at least 10 characters."),
  newEstimatedArrivalAt: eta,
  estimatedExtraCost: z.string().refine(validCost, "Enter a non-negative amount with at most two decimal places that can be sent without losing precision."),
  currency: z.string().max(3).trim().refine(value => !value || /^[A-Z]{3}$/.test(value), "Enter a three-letter uppercase ISO currency code."),
  note: z.string().max(4000),
}).refine(values => !values.estimatedExtraCost.trim() || Boolean(values.currency.trim()), { path: ["currency"], message: "Enter a currency for the estimated cost." })
export function buildBackupRequest(values: BackupRequestValues) {
  const valid = backupRequestFormSchema.parse(values)
  return backupChangeRequestSchema.parse({ ...valid, newEstimatedArrivalAt: new Date(valid.newEstimatedArrivalAt).toISOString(),
    estimatedExtraCost: valid.estimatedExtraCost.trim() ? Number(valid.estimatedExtraCost) : undefined,
    currency: valid.estimatedExtraCost.trim() ? valid.currency.trim() : undefined })
}
