import { z } from "zod"

import { TEMPLATE_STATUSES } from "@/features/compliance-catalog/template-types"

export const templateItemSchema = z.object({
  complianceRequirementId: z.string().min(1, "Select a requirement"),
  // Text while typing; converted to a number on submit.
  sequenceNo: z.string().trim(),
  isMandatory: z.boolean(),
  // Not shown in the UI (kept so edit does not reset it); new items default to false.
  appliesPerHorse: z.boolean(),
  // UI only: a row is read-only until its pencil is clicked; new rows start in edit mode.
  isEditing: z.boolean(),
  instruction: z.string().trim().max(1000, "Instruction is limited to 1000 characters"),
})

export const templateFormSchema = z
  .object({
    templateCode: z.string().trim().min(1, "Enter the template code").max(50, "Code is limited to 50 characters"),
    templateName: z.string().trim().min(1, "Enter the template name").max(200, "Name is limited to 200 characters"),
    description: z.string().trim().max(500, "Description is limited to 500 characters"),
    status: z.enum(TEMPLATE_STATUSES),
    effectiveFrom: z.string(),
    effectiveTo: z.string(),
    items: z.array(templateItemSchema).min(1, "Add at least one item"),
  })
  .superRefine((values, context) => {
    if (values.effectiveFrom && values.effectiveTo && values.effectiveTo < values.effectiveFrom) {
      context.addIssue({ code: "custom", path: ["effectiveTo"], message: "Effective To cannot be before Effective From" })
    }

    const sequences = new Map<number, number>()
    const requirements = new Map<string, number>()
    values.items.forEach((item, index) => {
      const sequence = Number(item.sequenceNo)
      if (!item.sequenceNo || !Number.isInteger(sequence) || sequence <= 0) {
        context.addIssue({ code: "custom", path: ["items", index, "sequenceNo"], message: "Positive number" })
      } else if (sequences.has(sequence)) {
        context.addIssue({ code: "custom", path: ["items", index, "sequenceNo"], message: "Duplicate number" })
      } else {
        sequences.set(sequence, index)
      }

      if (item.complianceRequirementId) {
        if (requirements.has(item.complianceRequirementId)) {
          context.addIssue({ code: "custom", path: ["items", index, "complianceRequirementId"], message: "Already added" })
        } else {
          requirements.set(item.complianceRequirementId, index)
        }
      }
    })
  })

export type TemplateFormValues = z.infer<typeof templateFormSchema>
export type TemplateItemFormValues = z.infer<typeof templateItemSchema>
