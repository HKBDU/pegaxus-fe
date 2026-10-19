import { z } from "zod"

import { REASON_MAX } from "@/features/personnel/constants"

const reasonMessage = (value: string, ctx: z.RefinementCtx) => {
  if (!value.trim()) ctx.addIssue({ code: "custom", path: ["reason"], message: "A reason is required." })
  else if (value.length > REASON_MAX) ctx.addIssue({ code: "custom", path: ["reason"], message: `Reason must be at most ${REASON_MAX} characters.` })
}

export interface Phase1FormValues {
  transportSpecialistId: string
  routeCoordinatorId: string
  reason: string
}

/**
 * SCR-F3-016. First assignment (PS1): both people required, no reason.
 * Change (PS5): at least one person differs from the current one and a reason is required.
 */
export function buildPhase1Schema(mode: "assign" | "change", current: { transportSpecialistId?: string; routeCoordinatorId?: string }) {
  return z
    .object({ transportSpecialistId: z.string(), routeCoordinatorId: z.string(), reason: z.string() })
    .superRefine((values, ctx) => {
      if (mode === "assign") {
        if (!values.transportSpecialistId) ctx.addIssue({ code: "custom", path: ["transportSpecialistId"], message: "Select a Transport Specialist." })
        if (!values.routeCoordinatorId) ctx.addIssue({ code: "custom", path: ["routeCoordinatorId"], message: "Select a Route Coordinator." })
        return
      }
      const tsChanged = Boolean(values.transportSpecialistId) && values.transportSpecialistId !== current.transportSpecialistId
      const rcChanged = Boolean(values.routeCoordinatorId) && values.routeCoordinatorId !== current.routeCoordinatorId
      if (!tsChanged && !rcChanged) {
        ctx.addIssue({ code: "custom", path: ["transportSpecialistId"], message: "Select a different Transport Specialist or Route Coordinator." })
      }
      reasonMessage(values.reason, ctx)
    })
}

/** SCR-F3-017 (PS3): every internal segment needs a driver and an escort. */
export const phase2AssignSchema = z.object({
  segments: z.array(
    z.object({
      routePlanRouteId: z.string(),
      driverEmployeeId: z.string().min(1, "Select a driver."),
      escortEmployeeId: z.string().min(1, "Select an escort."),
    }),
  ),
})
export type Phase2AssignFormValues = z.infer<typeof phase2AssignSchema>

export interface SegmentChangeFormValues {
  driverEmployeeId: string
  escortEmployeeId: string
  reason: string
}

/** SCR-F3-018 (PS4): at least one new person (different from the current one) and a reason. */
export function buildSegmentChangeSchema(current: { driverEmployeeId?: string; escortEmployeeId?: string }) {
  return z
    .object({ driverEmployeeId: z.string(), escortEmployeeId: z.string(), reason: z.string() })
    .superRefine((values, ctx) => {
      const driverChanged = Boolean(values.driverEmployeeId) && values.driverEmployeeId !== current.driverEmployeeId
      const escortChanged = Boolean(values.escortEmployeeId) && values.escortEmployeeId !== current.escortEmployeeId
      if (!driverChanged && !escortChanged) {
        ctx.addIssue({ code: "custom", path: ["driverEmployeeId"], message: "Select a new driver or a new escort." })
      }
      reasonMessage(values.reason, ctx)
    })
}
