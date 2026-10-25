import { z } from "zod"
import {
  AMOUNT_FORBIDDEN_RESOLUTIONS,
  AMOUNT_REQUIRED_RESOLUTIONS,
  CLAIM_LIMITS,
  CLAIM_SORTS,
  CLAIM_STATUSES,
  CLAIM_TYPES,
  RESOLUTION_TYPES,
} from "@/features/claim/constants"
import type { CancelClaimPayload, ResolveClaimPayload, SubmitClaimPayload } from "@/features/claim/types"

const WHOLE_NUMBER = /^\d+$/

/** Amounts stay digit strings in the forms (MoneyInput); "" means not given. NaN when not a whole VND amount. */
export function parseAmount(value: string) {
  const text = value.trim()
  if (!text) return undefined
  return WHOLE_NUMBER.test(text) ? Number(text) : Number.NaN
}

const optionalText = (label: string) => z.string().max(CLAIM_LIMITS.noteMax, `${label} must be at most ${CLAIM_LIMITS.noteMax} characters`)

/** CL2 form (screen §9). The amount is optional: an empty field is a claim that does not ask for money. */
export const submitClaimSchema = z.object({
  claimType: z.enum(CLAIM_TYPES, { error: "Select a claim type" }),
  title: z
    .string()
    .trim()
    .min(CLAIM_LIMITS.titleMin, `Title must be between ${CLAIM_LIMITS.titleMin} and ${CLAIM_LIMITS.titleMax} characters`)
    .max(CLAIM_LIMITS.titleMax, `Title must be between ${CLAIM_LIMITS.titleMin} and ${CLAIM_LIMITS.titleMax} characters`),
  description: z
    .string()
    .trim()
    .min(CLAIM_LIMITS.descriptionMin, `Description must be between ${CLAIM_LIMITS.descriptionMin} and ${CLAIM_LIMITS.descriptionMax} characters`)
    .max(CLAIM_LIMITS.descriptionMax, `Description must be between ${CLAIM_LIMITS.descriptionMin} and ${CLAIM_LIMITS.descriptionMax} characters`),
  requestedCompensationAmount: z.string().superRefine((value, ctx) => {
    const amount = parseAmount(value)
    if (amount === undefined) return
    if (Number.isNaN(amount)) ctx.addIssue({ code: "custom", message: "Amount must be a whole number of VND" })
    else if (amount <= 0) ctx.addIssue({ code: "custom", message: "Amount must be greater than 0" })
    else if (!Number.isSafeInteger(amount)) ctx.addIssue({ code: "custom", message: "Amount is too large" })
  }),
  customerNote: optionalText("Customer note"),
  evidenceNote: optionalText("Evidence note"),
})

export type SubmitClaimValues = z.infer<typeof submitClaimSchema>

export const emptySubmitClaimValues: SubmitClaimValues = {
  claimType: "" as SubmitClaimValues["claimType"],
  title: "",
  description: "",
  requestedCompensationAmount: "",
  customerNote: "",
  evidenceNote: "",
}

export function toSubmitPayload(values: SubmitClaimValues): SubmitClaimPayload {
  const amount = parseAmount(values.requestedCompensationAmount)
  return {
    claimType: values.claimType,
    title: values.title.trim(),
    description: values.description.trim(),
    ...(amount !== undefined ? { requestedCompensationAmount: amount } : {}),
    ...(values.evidenceNote.trim() ? { evidenceNote: values.evidenceNote.trim() } : {}),
    ...(values.customerNote.trim() ? { customerNote: values.customerNote.trim() } : {}),
  }
}

/** CL5 form (screen §10B). Amount rule per resolution type is contract R21. */
export const resolveClaimSchema = z
  .object({
    resolutionType: z.enum(RESOLUTION_TYPES, { error: "Select a resolution type" }),
    approvedCompensationAmount: z.string(),
    resolutionSummary: z
      .string()
      .trim()
      .min(CLAIM_LIMITS.summaryMin, `Summary must be between ${CLAIM_LIMITS.summaryMin} and ${CLAIM_LIMITS.summaryMax} characters`)
      .max(CLAIM_LIMITS.summaryMax, `Summary must be between ${CLAIM_LIMITS.summaryMin} and ${CLAIM_LIMITS.summaryMax} characters`),
    correctiveAction: optionalText("Corrective action"),
    internalNote: optionalText("Internal note"),
  })
  .superRefine((values, ctx) => {
    const amount = parseAmount(values.approvedCompensationAmount)
    const fail = (message: string) => ctx.addIssue({ code: "custom", path: ["approvedCompensationAmount"], message })
    if (AMOUNT_REQUIRED_RESOLUTIONS.includes(values.resolutionType)) {
      if (amount === undefined || Number.isNaN(amount) || amount <= 0) fail("Enter an approved amount greater than 0")
    } else if (values.resolutionType === "OTHER") {
      if (amount !== undefined && Number.isNaN(amount)) fail("Amount must be a whole number of VND")
    } else if (amount !== undefined && amount !== 0) fail("No amount applies to this resolution type")
  })

export type ResolveClaimValues = z.infer<typeof resolveClaimSchema>

export const emptyResolveClaimValues: ResolveClaimValues = {
  resolutionType: "COMPENSATION",
  approvedCompensationAmount: "",
  resolutionSummary: "",
  correctiveAction: "",
  internalNote: "",
}

export function toResolvePayload(values: ResolveClaimValues, lastUpdatedAt: string): ResolveClaimPayload {
  const noAmount = AMOUNT_FORBIDDEN_RESOLUTIONS.includes(values.resolutionType)
  const amount = noAmount ? undefined : parseAmount(values.approvedCompensationAmount)
  return {
    lastUpdatedAt,
    resolutionType: values.resolutionType,
    ...(amount !== undefined ? { approvedCompensationAmount: amount } : {}),
    resolutionSummary: values.resolutionSummary.trim(),
    ...(values.correctiveAction.trim() ? { correctiveAction: values.correctiveAction.trim() } : {}),
    ...(values.internalNote.trim() ? { internalNote: values.internalNote.trim() } : {}),
  }
}

/** CL6 form: the reason is mandatory for both roles. */
export const cancelClaimSchema = z.object({
  cancellationReason: z
    .string()
    .trim()
    .min(CLAIM_LIMITS.reasonMin, `Reason must be between ${CLAIM_LIMITS.reasonMin} and ${CLAIM_LIMITS.reasonMax} characters`)
    .max(CLAIM_LIMITS.reasonMax, `Reason must be between ${CLAIM_LIMITS.reasonMin} and ${CLAIM_LIMITS.reasonMax} characters`),
})

export type CancelClaimValues = z.infer<typeof cancelClaimSchema>

export function toCancelPayload(values: CancelClaimValues, lastUpdatedAt: string): CancelClaimPayload {
  return { lastUpdatedAt, cancellationReason: values.cancellationReason.trim() }
}

/** URL filters of the manager list; an unknown value falls back to "no filter". */
export const claimFilterSchema = z.object({
  search: z.string().max(200).optional(),
  claimType: z.enum(CLAIM_TYPES).optional().catch(undefined),
  status: z.enum(CLAIM_STATUSES).optional().catch(undefined),
  sortBy: z.enum(CLAIM_SORTS).catch("submittedAt:desc"),
  pageIndex: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(8),
})
