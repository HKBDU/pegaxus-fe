import { z } from "zod"

import { COMPLIANCE_CATEGORIES, COMPLIANCE_STATUSES } from "@/features/compliance-catalog/types"
import { VALIDATION_LIMITS } from "@/shared/constants/validation-limits"

export const complianceFormSchema = z
  .object({
    requirementCode: z.string().trim().min(1, "Enter the requirement code").max(50, "Code is limited to 50 characters"),
    requirementName: z.string().trim().min(1, "Enter the requirement name").max(200, "Name is limited to 200 characters"),
    country: z.string().trim().max(100),
    category: z.enum(COMPLIANCE_CATEGORIES, { error: "Select a classification" }),
    issuingAuthority: z.string().trim().max(200, "Issuing authority is limited to 200 characters"),
    bcpCode: z.string().trim().max(50, "BCP code is limited to 50 characters"),
    legalBasis: z.string().trim().max(1000, "Legal basis is limited to 1000 characters"),
    description: z.string().trim().max(VALIDATION_LIMITS.noteMaxLength, `Description is limited to ${VALIDATION_LIMITS.noteMaxLength} characters`),
    validityRequired: z.boolean(),
    // Kept as text while typing; converted to a number on submit.
    validityPeriodDays: z.string().trim(),
    status: z.enum(COMPLIANCE_STATUSES),
  })
  .superRefine((values, context) => {
    if (!values.validityRequired) return
    const days = Number(values.validityPeriodDays)
    if (!values.validityPeriodDays || !Number.isInteger(days) || days <= 0 || days > VALIDATION_LIMITS.validityPeriodDaysMax) {
      context.addIssue({
        code: "custom",
        path: ["validityPeriodDays"],
        message: `Validity period must be between ${VALIDATION_LIMITS.validityPeriodDaysMin} and ${VALIDATION_LIMITS.validityPeriodDaysMax} days.`,
      })
    }
  })

export type ComplianceFormValues = z.infer<typeof complianceFormSchema>
