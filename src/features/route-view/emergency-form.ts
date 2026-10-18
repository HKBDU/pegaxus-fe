import { z } from "zod";
import { transportPlanFormSchema } from "@/features/transport-plan/schemas";
import { backupChangeRequestSchema } from "./schemas";

/** Extra cost is entered in VND only, as a whole amount; the request carries no currency. */
export const backupRequestDefaults = {
  reason: "",
  newEstimatedArrivalAt: "",
  estimatedExtraCost: "",
  note: "",
};
export type BackupRequestValues = typeof backupRequestDefaults;
const eta = transportPlanFormSchema.shape.plannedStartAt;
const validCost = (value: string) => {
  const text = value.trim();
  if (!text) return true;
  if (!/^\d+$/.test(text)) return false;
  const amount = Number(text);
  return Number.isSafeInteger(amount) && amount <= 9_999_999_999_999_998;
};
export const backupRequestFormSchema = z.object({
  reason: z
    .string()
    .max(4000)
    .trim()
    .min(10, "Explain the change in at least 10 characters."),
  newEstimatedArrivalAt: eta,
  estimatedExtraCost: z
    .string()
    .refine(
      validCost,
      "Enter a whole, non-negative amount in VND (no decimals).",
    ),
  note: z.string().max(4000),
});
export function buildBackupRequest(values: BackupRequestValues) {
  const valid = backupRequestFormSchema.parse(values);
  const hasCost = Boolean(valid.estimatedExtraCost.trim());
  return backupChangeRequestSchema.parse({
    ...valid,
    newEstimatedArrivalAt: new Date(valid.newEstimatedArrivalAt).toISOString(),
    estimatedExtraCost: hasCost ? Number(valid.estimatedExtraCost) : undefined,
  });
}
