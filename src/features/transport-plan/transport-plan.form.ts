import { z } from "zod";
import { canAccess } from "@/features/auth/access-control";
import type { AuthPrincipal } from "@/features/auth/types";
import type {
  TransportPlanDetail,
  UpdateTransportPlanInput,
  TransportPlanFormValues,
} from "./types";
import {
  createTransportPlanSchema,
  updateTransportPlanSchema,
  transportPlanFormSchema,
  editTransportPlanFormSchema,
} from "./schemas";

import { toLocalDateTime } from "./format";

// Keep existing form helper exports available while validation/types are canonical.
export {
  transportPlanFormSchema,
  editTransportPlanFormSchema,
} from "./schemas";
export { emptyPlanForm } from "./constants";
export { toLocalDateTime } from "./format";
export type { TransportPlanFormValues } from "./types";

export function planToForm(plan: TransportPlanDetail): TransportPlanFormValues {
  return {
    plannedStartAt: toLocalDateTime(plan.plannedStartAt),
    plannedEndAt: toLocalDateTime(plan.plannedEndAt),
    estimatedDistanceKm:
      plan.estimatedDistanceKm == null ? "" : String(plan.estimatedDistanceKm),
    estimatedDurationMinutes:
      plan.estimatedDurationMinutes == null
        ? ""
        : String(plan.estimatedDurationMinutes),
    planningNote: plan.planningNote ?? "",
    updateReason: "",
  };
}
export function buildCreatePlanInput(values: TransportPlanFormValues) {
  const valid = transportPlanFormSchema.parse(values);
  return createTransportPlanSchema.parse({
    plannedStartAt: new Date(valid.plannedStartAt).toISOString(),
    plannedEndAt: new Date(valid.plannedEndAt).toISOString(),
    ...(valid.estimatedDistanceKm.trim()
      ? { estimatedDistanceKm: Number(valid.estimatedDistanceKm) }
      : {}),
    ...(valid.estimatedDurationMinutes.trim()
      ? { estimatedDurationMinutes: Number(valid.estimatedDurationMinutes) }
      : {}),
    ...(valid.planningNote.trim()
      ? { planningNote: valid.planningNote.trim() }
      : {}),
  });
}
export function buildUpdatePlanInput(
  values: TransportPlanFormValues,
  plan: TransportPlanDetail,
) {
  const valid = editTransportPlanFormSchema.parse(values);
  const original = planToForm(plan);
  const input: UpdateTransportPlanInput = { lastUpdatedAt: plan.updatedAt };
  if (valid.plannedStartAt && valid.plannedStartAt !== original.plannedStartAt)
    input.plannedStartAt = new Date(valid.plannedStartAt).toISOString();
  if (valid.plannedEndAt && valid.plannedEndAt !== original.plannedEndAt)
    input.plannedEndAt = new Date(valid.plannedEndAt).toISOString();
  const start = input.plannedStartAt ?? plan.plannedStartAt;
  const end = input.plannedEndAt ?? plan.plannedEndAt;
  if (start && end && Date.parse(end) <= Date.parse(start))
    throw new z.ZodError([
      {
        code: "custom",
        path: ["plannedEndAt"],
        message: "Planned end must be after planned start.",
      },
    ]);
  if (
    valid.estimatedDistanceKm.trim() &&
    Number(valid.estimatedDistanceKm) !== plan.estimatedDistanceKm
  )
    input.estimatedDistanceKm = Number(valid.estimatedDistanceKm);
  if (
    valid.estimatedDurationMinutes.trim() &&
    Number(valid.estimatedDurationMinutes) !== plan.estimatedDurationMinutes
  )
    input.estimatedDurationMinutes = Number(valid.estimatedDurationMinutes);
  if (valid.planningNote.trim() !== original.planningNote.trim())
    input.planningNote = valid.planningNote.trim();
  if (valid.updateReason.trim()) input.updateReason = valid.updateReason.trim();
  return updateTransportPlanSchema.parse(input);
}
export function canEditTransportPlan(
  principal: AuthPrincipal | null,
  plan: Pick<TransportPlanDetail, "status" | "transport">,
) {
  return (
    canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] }) &&
    ["DRAFT", "PENDING", "APPROVED"].includes(plan.status) &&
    !["IN_TRANSIT", "COMPLETED", "CANCELLED"].includes(plan.transport.status)
  );
}
