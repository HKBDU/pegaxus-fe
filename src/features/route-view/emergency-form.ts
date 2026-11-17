import { z } from "zod";
import { transportPlanFormSchema } from "@/features/transport-plan/schemas";
import { backupChangeRequestSchema } from "./schemas";

export const backupRequestDefaults = {
  reason: "",
  newEstimatedArrivalAt: "",
  note: "",
};
export type BackupRequestValues = typeof backupRequestDefaults;
const eta = transportPlanFormSchema.shape.plannedStartAt;
export const backupRequestFormSchema = z.object({
  reason: z
    .string()
    .max(4000)
    .trim()
    .min(10, "Explain the change in at least 10 characters."),
  newEstimatedArrivalAt: eta,
  note: z.string().max(4000),
});
export function buildBackupRequest(values: BackupRequestValues) {
  const valid = backupRequestFormSchema.parse(values);
  return backupChangeRequestSchema.parse({
    ...valid,
    newEstimatedArrivalAt: new Date(valid.newEstimatedArrivalAt).toISOString(),
  });
}
