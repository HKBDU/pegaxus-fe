import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { forwardRef } from "react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import type { BookedHorse } from "@/features/booking/types"
import { templateControlClass } from "@/features/compliance-catalog/components/TemplateItemsEditor"
import type { CustomRequirementDraft } from "@/features/compliance-catalog/dossier-types"
import type { ComplianceRequirementSummary } from "@/features/compliance-catalog/types"
import { cn } from "@/lib/utils"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Switch } from "@/shared/components/ui/switch"
import { Textarea } from "@/shared/components/ui/textarea"

const NOTES_LIMIT = 500
const labelClass = "text-xs font-medium leading-4 text-slate-700"

const customRequirementSchema = z
  .object({
    complianceRequirementId: z.string().min(1, "Select a requirement"),
    scope: z.enum(["TRIP", "HORSE"]),
    horseId: z.string(),
    isMandatory: z.boolean(),
    dueDate: z.string(),
    instruction: z.string().trim().max(NOTES_LIMIT, `Notes are limited to ${NOTES_LIMIT} characters`),
  })
  .superRefine((values, context) => {
    if (values.scope === "HORSE" && !values.horseId) {
      context.addIssue({ code: "custom", path: ["horseId"], message: "Select a horse" })
    }
  })

type CustomRequirementValues = z.infer<typeof customRequirementSchema>

const defaultValues: CustomRequirementValues = {
  complianceRequirementId: "",
  scope: "TRIP",
  horseId: "",
  isMandatory: true,
  dueDate: "",
  instruction: "",
}

interface AddCustomRequirementPanelProps {
  horses: BookedHorse[]
  requirements: ComplianceRequirementSummary[]
  requirementsLoading: boolean
  /** Returns an error message when the line cannot be added (duplicate), otherwise null. */
  onAdd: (draft: CustomRequirementDraft) => string | null
}

/** Adds one extra DossierRequirement (same fields as D3) on top of the template lines. */
export const AddCustomRequirementPanel = forwardRef<HTMLDivElement, AddCustomRequirementPanelProps>(function AddCustomRequirementPanel(
  { horses, requirements, requirementsLoading, onAdd },
  ref,
) {
  const form = useForm<CustomRequirementValues>({ resolver: zodResolver(customRequirementSchema), defaultValues })
  const scope = useWatch({ control: form.control, name: "scope" })
  const instruction = useWatch({ control: form.control, name: "instruction" })

  const submit = form.handleSubmit((values) => {
    const requirement = requirements.find((item) => String(item.complianceRequirementId) === values.complianceRequirementId)
    if (!requirement) return
    const horse = values.scope === "HORSE" ? horses.find((item) => String(item.horseId) === values.horseId) : undefined

    const error = onAdd({
      key: crypto.randomUUID(),
      complianceRequirementId: requirement.complianceRequirementId,
      requirementCode: requirement.requirementCode,
      requirementName: requirement.requirementName,
      category: requirement.category,
      horseId: horse ? horse.horseId : null,
      horseName: horse ? horse.horseName : null,
      isMandatory: values.isMandatory,
      dueDate: values.dueDate || undefined,
      instruction: values.instruction || undefined,
    })
    if (error) {
      form.setError("complianceRequirementId", { message: error })
      return
    }
    form.reset({ ...defaultValues, scope: values.scope })
  })

  return (
    <section ref={ref} aria-labelledby="custom-title" className="booking-panel border bg-white p-5">
      <h2 id="custom-title" className="m-0! font-heading text-lg! leading-6! font-bold! tracking-[0.02em]! text-[#ef8f00]! uppercase">Add Custom Requirement</h2>
      <p className="m-0 mt-0.5 text-xs text-slate-500">Add an additional requirement not included in the template.</p>

      <Form {...form}>
        <form onSubmit={submit} noValidate className="mt-4 grid gap-3.5">
          <FormField
            control={form.control}
            name="complianceRequirementId"
            render={({ field }) => (
              <FormItem className="gap-1.5">
                <FormLabel className={labelClass}>Compliance requirement <span className="text-red-500">*</span></FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={requirementsLoading}>
                  <FormControl>
                    <SelectTrigger className={cn(templateControlClass, "min-w-0 max-w-full justify-between overflow-hidden data-[placeholder]:text-slate-400 *:data-[slot=select-value]:block *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:truncate")}>
                      <SelectValue placeholder={requirementsLoading ? "Loading requirements..." : "Select a requirement..."} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-72 rounded-[2px]">
                    {requirements.map((requirement) => (
                      <SelectItem key={String(requirement.complianceRequirementId)} value={String(requirement.complianceRequirementId)} className="text-xs">
                        {requirement.requirementCode} — {requirement.requirementName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="scope"
              render={({ field }) => (
                <FormItem className="gap-1.5">
                  <FormLabel className={labelClass}>Applies to <span className="text-red-500">*</span></FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value)
                      if (value === "TRIP") form.setValue("horseId", "")
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className={cn(templateControlClass, "justify-between")}><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-[2px]">
                      <SelectItem value="TRIP" className="text-xs">Per trip</SelectItem>
                      <SelectItem value="HORSE" className="text-xs">Per horse</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="horseId"
              render={({ field }) => (
                <FormItem className="gap-1.5">
                  <FormLabel className={labelClass}>Horse</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={scope !== "HORSE"}>
                    <FormControl>
                      <SelectTrigger className={cn(templateControlClass, "min-w-0 max-w-full justify-between overflow-hidden data-[placeholder]:text-slate-400 *:data-[slot=select-value]:block *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:truncate")}>
                        <SelectValue placeholder="Select horse..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-[2px]">
                      {horses.map((horse) => (
                        <SelectItem key={String(horse.horseId)} value={String(horse.horseId)} className="text-xs">{horse.horseName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="isMandatory"
              render={({ field }) => (
                <FormItem className="gap-1.5">
                  <FormLabel className={labelClass}>Mandatory</FormLabel>
                  <div className="flex h-9 items-center gap-2">
                    <FormControl>
                      <Switch size="sm" checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <span className="text-xs text-slate-700">{field.value ? "Yes" : "No"}</span>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="gap-1.5">
                  <FormLabel className={labelClass}>Due date</FormLabel>
                  <FormControl>
                    <DatePicker ref={field.ref} value={field.value} onChange={field.onChange} onBlur={field.onBlur} placeholder="Optional" className={cn(templateControlClass, "data-[empty=true]:text-slate-400")} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="instruction"
            render={({ field }) => (
              <FormItem className="gap-1.5">
                <FormLabel className={labelClass}>Notes (optional)</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={2} maxLength={NOTES_LIMIT} placeholder="Add any specific notes or instructions..." className={cn(templateControlClass, "h-auto max-h-36 min-h-14 resize-none overflow-y-auto py-2 leading-5")} />
                </FormControl>
                <span className="text-right text-[0.7rem] text-slate-400">{instruction.length}/{NOTES_LIMIT}</span>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <button
            type="submit"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[2px] bg-[#ef8f00] px-3 font-heading text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-950 transition-colors hover:bg-[#db8300] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Plus className="size-3.5" />
            Add requirement
          </button>
        </form>
      </Form>
    </section>
  )
})
