import { zodResolver } from "@hookform/resolvers/zod"
import { Info, Plus, TriangleAlert } from "lucide-react"
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
    leadTimeDays: z.string().min(1, "Enter lead time days"),
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
  leadTimeDays: "5",
  instruction: "",
}

function ChoiceCard({ selected, title, hint, onSelect }: { selected: boolean; title: string; hint: string; onSelect: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onSelect} className={cn("flex items-start gap-2.5 rounded-[2px] border px-3 py-2.5 text-left transition-colors", selected ? "border-amber-500 bg-amber-50" : "border-slate-200 bg-white hover:bg-slate-50")}>
      <span aria-hidden="true" className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border", selected ? "border-[#ef8f00]" : "border-slate-300")}>
        <span className={cn("size-2 rounded-full", selected ? "bg-[#ef8f00]" : "bg-transparent")} />
      </span>
      <span className="grid">
        <span className="text-sm font-semibold text-slate-900">{title}</span>
        <span className="text-xs text-slate-500">{hint}</span>
      </span>
    </button>
  )
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
  const values = useWatch({ control: form.control })
  const selectedRequirement = requirements.find((item) => String(item.complianceRequirementId) === values.complianceRequirementId)
  const selectedHorse = horses.find((horse) => String(horse.horseId) === values.horseId)

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
      dueDate: values.leadTimeDays ? new Date(Date.now() + Number(values.leadTimeDays) * 86400000).toISOString().slice(0, 10) : undefined,
      instruction: values.instruction || undefined,
    })
    if (error) {
      form.setError("complianceRequirementId", { message: error })
      return
    }
    form.reset({ ...defaultValues, scope: values.scope })
  })

  return (
    <section ref={ref} aria-label="Custom dossier requirement form" className="border-0 bg-transparent p-0">

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Form {...form}>
        <form onSubmit={submit} noValidate className="grid gap-3.5">
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

          <FormField
            control={form.control}
            name="scope"
            render={({ field }) => (
              <FormItem className="gap-1.5">
                <FormLabel className={labelClass}>Scope <span className="text-red-500">*</span></FormLabel>
                <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
                  <ChoiceCard selected={field.value === "TRIP"} title="Trip-level" hint="Applies to the entire trip (all horses)" onSelect={() => { field.onChange("TRIP"); form.setValue("horseId", "") }} />
                  <ChoiceCard selected={field.value === "HORSE"} title="Horse-specific" hint="Applies to a specific horse in this booking" onSelect={() => field.onChange("HORSE")} />
                </div>
              </FormItem>
            )}
          />

          {scope === "HORSE" ? <FormField
            control={form.control}
            name="horseId"
            render={({ field }) => (
              <FormItem className="gap-1.5">
                <FormLabel className={labelClass}>Applies to horse <span className="text-red-500">*</span></FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger className={cn(templateControlClass, "justify-between")}><SelectValue placeholder="Select a horse..." /></SelectTrigger></FormControl>
                  <SelectContent className="rounded-[2px]">{horses.map((horse) => <SelectItem key={String(horse.horseId)} value={String(horse.horseId)} className="text-xs">{horse.horseName}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          /> : null}

          <FormField
            control={form.control}
            name="isMandatory"
            render={({ field }) => (
              <FormItem className="gap-1.5">
                <FormLabel className={labelClass}>Mandatory <span className="text-red-500">*</span></FormLabel>
                <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
                  <ChoiceCard selected={!field.value} title="Optional" hint="Not required, but can be requested." onSelect={() => field.onChange(false)} />
                  <ChoiceCard selected={field.value} title="Mandatory" hint="Required for this trip/horse." onSelect={() => field.onChange(true)} />
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="leadTimeDays"
            render={({ field }) => (
              <FormItem className="gap-1.5">
                <FormLabel className={labelClass}>Lead time (days) <span className="text-red-500">*</span></FormLabel>
                <FormControl><input {...field} type="number" min="0" className={cn(templateControlClass, "w-full")} /></FormControl>
                <p className="m-0 text-[0.7rem] text-slate-500">Number of days before due date for customer preparation.</p>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <div className="hidden">
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
              name="leadTimeDays"
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
                <FormLabel className={labelClass}>Instruction for customer</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={3} maxLength={NOTES_LIMIT} placeholder="Explain what the customer has to prepare and submit..." className={cn(templateControlClass, "h-auto max-h-40 min-h-20 resize-none overflow-y-auto py-2 leading-5")} />
                </FormControl>
                <span className="text-right text-[0.7rem] text-slate-400">{instruction.length}/{NOTES_LIMIT}</span>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <div role="note" className="flex items-start gap-2 rounded-[2px] border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-900">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <p className="m-0">If the selected requirement has a validity period, the valid-until date is calculated automatically.</p>
          </div>
          {!instruction.trim() ? <p className="m-0 flex items-center gap-1.5 text-xs text-amber-700"><TriangleAlert className="size-3.5" />Instruction is recommended for custom requirements.</p> : null}
          <button
            type="submit"
            className="inline-flex h-8 w-fit items-center justify-self-end gap-1.5 rounded-[2px] bg-[#ef8f00] px-4 font-heading text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-950 transition-colors hover:bg-[#db8300] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Plus className="size-3.5" />
            Add requirement
          </button>
        </form>
      </Form>
      <aside aria-label="Preview" className="h-fit rounded-[2px] border border-slate-200 bg-slate-50 p-4">
        <h3 className="m-0! font-heading text-xs! font-semibold! uppercase tracking-[0.08em]! text-slate-900!">Preview of generated dossier requirement</h3>
        <p className="m-0 mt-1 text-[0.7rem] text-slate-500">This is a preview of the DossierRequirement that will be created based on the information entered.</p>
        <dl className="m-0 mt-3 grid grid-cols-[6rem_minmax(0,1fr)] gap-x-3 gap-y-2.5 border-t border-slate-200 pt-3 text-xs">
          <dt className="text-slate-400">CR CODE</dt><dd className="m-0 font-medium text-slate-900">Auto-generated on save</dd>
          <dt className="text-slate-400">REQUIREMENT</dt><dd className="m-0 font-medium text-slate-900">{selectedRequirement ? `${selectedRequirement.requirementCode} - ${selectedRequirement.requirementName}` : "Not selected"}</dd>
          <dt className="text-slate-400">SCOPE</dt><dd className="m-0 font-medium text-slate-900">{scope === "HORSE" ? "Horse-specific" : "Trip-level"}</dd>
          {scope === "HORSE" ? <><dt className="text-slate-400">HORSE</dt><dd className="m-0 font-medium text-slate-900">{selectedHorse?.horseName ?? "Not selected"}</dd></> : null}
          <dt className="text-slate-400">MANDATORY</dt><dd className="m-0 font-medium text-slate-900">{values.isMandatory ? "Mandatory" : "Optional"}</dd>
          <dt className="text-slate-400">LEAD TIME</dt><dd className="m-0 font-medium text-slate-900">{values.leadTimeDays} days</dd>
          <dt className="text-slate-400">SOURCE</dt><dd className="m-0"><span className="rounded-[2px] bg-amber-100 px-1.5 py-0.5 text-[0.65rem] font-semibold text-amber-800">Custom</span></dd>
        </dl>
        <p className="m-0 mt-3 flex items-start gap-1.5 rounded-[2px] border border-sky-200 bg-sky-50 px-2.5 py-2 text-[0.7rem] leading-4 text-sky-900"><Info className="mt-0.5 size-3 shrink-0" aria-hidden="true" />This DossierRequirement is added to the active ComplianceDossier only.</p>
      </aside>
      </div>
    </section>
  )
})
