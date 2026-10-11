import { z } from "zod"
import { transportPlanFormSchema } from "@/features/transport-plan/transport-plan.form"
import { backupChangeRequestSchema } from "./schemas"

export const backupRequestDefaults = { reason: "", newEstimatedArrivalAt: "", estimatedExtraCost: "", currency: "", note: "" }
export type BackupRequestValues = typeof backupRequestDefaults
const eta = transportPlanFormSchema.shape.plannedStartAt
export const backupRequestFormSchema = z.object({
  reason: z.string().trim().min(10, "Explain the change in at least 10 characters."),
  newEstimatedArrivalAt: eta,
  estimatedExtraCost: z.string().refine(value => !value.trim() || Number.isFinite(Number(value)), "Enter a valid number."),
  currency: z.string(), note: z.string(),
}).refine(values => !values.estimatedExtraCost.trim() || Boolean(values.currency.trim()), { path: ["currency"], message: "Enter a currency for the estimated cost." })
export function buildBackupRequest(values: BackupRequestValues) {
  const valid = backupRequestFormSchema.parse(values)
  return backupChangeRequestSchema.parse({ ...valid, newEstimatedArrivalAt: new Date(valid.newEstimatedArrivalAt).toISOString(),
    estimatedExtraCost: valid.estimatedExtraCost.trim() ? Number(valid.estimatedExtraCost) : undefined,
    currency: valid.estimatedExtraCost.trim() ? valid.currency.trim() : undefined })
}
