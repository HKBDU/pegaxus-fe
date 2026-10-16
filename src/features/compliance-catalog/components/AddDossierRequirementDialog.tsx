import { zodResolver } from "@hookform/resolvers/zod"
import { Info, Plus, TriangleAlert } from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { cn } from "@/lib/utils"
import { MandatoryBadge } from "@/features/compliance-catalog/components/RequirementBadges"
import { templateControlClass } from "@/features/compliance-catalog/components/TemplateItemsEditor"
import { useAddDossierRequirement } from "@/features/compliance-catalog/hooks"
import type { DossierRequirementItem } from "@/features/compliance-catalog/dossier-types"
import { getRequirementErrorMessage } from "@/features/compliance-catalog/template-utils"
import type { ComplianceRequirementSummary } from "@/features/compliance-catalog/types"
import { Button } from "@/shared/components/ui/button"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Textarea } from "@/shared/components/ui/textarea"
import { useRequestAttemptGuard } from "@/shared/hooks/useRequestAttemptGuard"
import type { EntityId } from "@/shared/types"

const INSTRUCTION_LIMIT = 1000
const labelClass = "font-heading text-[11px] font-medium uppercase leading-4 tracking-[0.06em] text-slate-700"

const schema = z
  .object({
    complianceRequirementId: z.string().min(1, "Select a requirement"),
    scope: z.enum(["TRIP", "HORSE"]),
    horseId: z.string(),
    isMandatory: z.enum(["YES", "NO"]),
    dueDate: z.string(),
    instruction: z.string().trim().max(INSTRUCTION_LIMIT, `Instruction is limited to ${INSTRUCTION_LIMIT} characters`),
  })
  .superRefine((values, context) => {
    if (values.scope === "HORSE" && !values.horseId) {
      context.addIssue({ code: "custom", path: ["horseId"], message: "Select a horse" })
    }
  })

type FormValues = z.infer<typeof schema>

const defaultValues: FormValues = { complianceRequirementId: "", scope: "TRIP", horseId: "", isMandatory: "NO", dueDate: "", instruction: "" }

export interface HorseOption {
  id: EntityId
  name: string
}

interface AddDossierRequirementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dossierId: EntityId
  bookingCode: string
  /** Lead time is derived from it; unknown (e.g. the booking schedule is not readable) falls back to 0. */
  plannedDepartureDate?: string
  horses: HorseOption[]
  requirements: ComplianceRequirementSummary[]
  requirementsLoading: boolean
  /** Lines already in the dossier, to refuse a duplicate before calling the BE (DR_DUPLICATE). */
  existing: DossierRequirementItem[]
}

function ChoiceCard({ selected, title, hint, onSelect }: { selected: boolean; title: string; hint: string; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex items-start gap-2.5 rounded-[2px] border px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-primary",
        selected ? "border-amber-500 bg-amber-50" : "border-slate-200 bg-white hover:bg-slate-50",
      )}
    >
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

function PreviewLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd className="m-0 min-w-0 break-words font-medium text-slate-900">{children}</dd>
    </>
  )
}

/** SCR-F2-009: adds one extra DossierRequirement to an existing ComplianceDossier (D3). */
export function AddDossierRequirementDialog({ open, onOpenChange, dossierId, bookingCode, plannedDepartureDate, horses, requirements, requirementsLoading, existing }: AddDossierRequirementDialogProps) {
  const addRequirement = useAddDossierRequirement(dossierId)
  const attempt = useRequestAttemptGuard()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues })
  const values = useWatch({ control: form.control })

  // Every opening starts from an empty form, whatever was typed before.
  useEffect(() => {
    if (!open) return
    form.reset(defaultValues)
    attempt.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const selectedRequirement = requirements.find((item) => String(item.complianceRequirementId) === values.complianceRequirementId)
  const selectedHorse = horses.find((horse) => String(horse.id) === values.horseId)
  const instruction = values.instruction ?? ""

  const submit = form.handleSubmit(async (formValues) => {
    setSubmitError(null)
    const horseId = formValues.scope === "HORSE" ? formValues.horseId : null
    const duplicated = existing.some(
      (item) => String(item.complianceRequirementId) === formValues.complianceRequirementId && String(item.horseId) === String(horseId),
    )
    if (duplicated) {
      form.setError("complianceRequirementId", { message: getRequirementErrorMessage(new Error("DR_DUPLICATE"), "This requirement is already in the dossier.") })
      return
    }

    try {
      const guarded = await attempt.run(() =>
        addRequirement.mutateAsync({
          complianceRequirementId: formValues.complianceRequirementId,
          horseId,
          isMandatory: formValues.isMandatory === "YES",
          dueDate: formValues.dueDate || undefined,
          instruction: formValues.instruction || undefined,
          leadTimeDays: formValues.dueDate && plannedDepartureDate
            ? Math.max(0, Math.round((Date.parse(`${plannedDepartureDate}T00:00:00Z`) - Date.parse(`${formValues.dueDate}T00:00:00Z`)) / 86_400_000))
            : 0,
          reason: "Added from dossier detail",
        }),
      )
      if (!guarded.started) return
      toast.success("DossierRequirement added to ComplianceDossier successfully.")
      onOpenChange(false)
    } catch (error) {
      const code = error instanceof Error ? error.message : ""
      if (code === "DR_DUPLICATE") {
        form.setError("complianceRequirementId", { message: getRequirementErrorMessage(error, "This requirement is already in the dossier.") })
        return
      }
      setSubmitError(getRequirementErrorMessage(error, "Unable to add this requirement"))
    }
  })

  const isSaving = addRequirement.isPending

  return (
    <Dialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <DialogContent className="max-h-[92dvh] gap-0 overflow-y-auto rounded-[2px] border-slate-200 bg-white p-0 sm:max-w-5xl">
        <DialogHeader className="border-b border-slate-200 px-6 py-4 text-left">
          <DialogTitle className="m-0! font-heading text-2xl! font-bold! uppercase tracking-[0.02em]! text-[#ef8f00]!">Add custom dossier requirement</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">As a Transport Specialist, you can add a custom DossierRequirement to this ComplianceDossier.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Form {...form}>
            <form id="add-dossier-requirement-form" onSubmit={submit} noValidate className="grid min-w-0 content-start gap-4">
              <FormField
                control={form.control}
                name="complianceRequirementId"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <FormLabel className={labelClass}>Compliance requirement (CR) <span className="text-red-500">*</span></FormLabel>
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
                    <p className="m-0 text-[0.7rem] text-slate-500">Only ACTIVE ComplianceRequirements can be selected.</p>
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
                    <div role="radiogroup" aria-label="Scope" className="grid gap-2 sm:grid-cols-2">
                      <ChoiceCard selected={field.value === "TRIP"} title="Trip-level" hint="Applies to the entire trip (all horses)" onSelect={() => { field.onChange("TRIP"); form.setValue("horseId", "") }} />
                      <ChoiceCard selected={field.value === "HORSE"} title="Horse-specific" hint="Applies to a specific horse in this booking" onSelect={() => field.onChange("HORSE")} />
                    </div>
                  </FormItem>
                )}
              />

              {values.scope === "HORSE" ? (
                <FormField
                  control={form.control}
                  name="horseId"
                  render={({ field }) => (
                    <FormItem className="gap-1.5">
                      <FormLabel className={labelClass}>Applies to horse <span className="text-red-500">*</span></FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className={cn(templateControlClass, "justify-between data-[placeholder]:text-slate-400")}>
                            <SelectValue placeholder="Select a horse..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-[2px]">
                          {horses.map((horse) => (
                            <SelectItem key={String(horse.id)} value={String(horse.id)} className="text-xs">{horse.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              ) : null}

              <FormField
                control={form.control}
                name="isMandatory"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <FormLabel className={labelClass}>Mandatory <span className="text-red-500">*</span></FormLabel>
                    <div role="radiogroup" aria-label="Mandatory" className="grid gap-2 sm:grid-cols-2">
                      <ChoiceCard selected={field.value === "NO"} title="Optional" hint="Not required, but can be requested." onSelect={() => field.onChange("NO")} />
                      <ChoiceCard selected={field.value === "YES"} title="Mandatory" hint="Required for this trip/horse." onSelect={() => field.onChange("YES")} />
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
                    <p className="m-0 text-[0.7rem] text-slate-500">The date by which the customer should have submitted this requirement.</p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instruction"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <FormLabel className={labelClass}>Instruction for customer</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} maxLength={INSTRUCTION_LIMIT} placeholder="Explain what the customer has to prepare and submit..." className={cn(templateControlClass, "h-auto max-h-40 min-h-20 resize-none overflow-y-auto py-2 leading-5")} />
                    </FormControl>
                    <span className="text-right text-[0.7rem] text-slate-400">{instruction.length}/{INSTRUCTION_LIMIT}</span>
                    {!instruction.trim() ? (
                      <p className="m-0 flex items-center gap-1.5 text-xs text-amber-700"><TriangleAlert className="size-3.5" aria-hidden="true" />Instruction is recommended for custom requirements.</p>
                    ) : null}
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div role="note" className="flex items-start gap-2 rounded-[2px] border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-900">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                <p className="m-0">If the selected CR has a validity period, the valid-until date is calculated automatically when the DR is created.</p>
              </div>

              {submitError ? <p role="alert" className="m-0 text-xs text-destructive">{submitError}</p> : null}
            </form>
          </Form>

          <aside aria-label="Preview" className="h-fit rounded-[2px] border border-slate-200 bg-slate-50 p-4">
            <h3 className="m-0! font-heading text-xs! font-semibold! uppercase tracking-[0.08em]! text-slate-900!">Preview of generated dossier requirement</h3>
            <p className="m-0 mt-1 text-[0.7rem] text-slate-500">This is a preview of what will be created from the information entered.</p>
            <dl className="m-0 mt-3 grid grid-cols-[6rem_minmax(0,1fr)] gap-x-3 gap-y-2.5 border-t border-slate-200 pt-3 text-xs">
              <PreviewLine label="Booking">{bookingCode}</PreviewLine>
              <PreviewLine label="Requirement">{selectedRequirement ? `${selectedRequirement.requirementCode} — ${selectedRequirement.requirementName}` : "—"}</PreviewLine>
              <PreviewLine label="Scope">{values.scope === "HORSE" ? "Horse-specific" : "Trip-level"}</PreviewLine>
              {values.scope === "HORSE" ? <PreviewLine label="Horse">{selectedHorse?.name ?? "—"}</PreviewLine> : null}
              <PreviewLine label="Mandatory"><MandatoryBadge mandatory={values.isMandatory === "YES"} /></PreviewLine>
              <PreviewLine label="Due date">{values.dueDate || "—"}</PreviewLine>
              <PreviewLine label="Source"><span className="rounded-[2px] bg-amber-100 px-1.5 py-0.5 text-[0.65rem] font-semibold text-amber-800">Custom</span></PreviewLine>
              <PreviewLine label="Instruction"><span className="font-normal text-slate-600">{instruction.trim() || "—"}</span></PreviewLine>
            </dl>
            <p className="m-0 mt-3 flex items-start gap-1.5 rounded-[2px] border border-sky-200 bg-sky-50 px-2.5 py-2 text-[0.7rem] leading-4 text-sky-900">
              <Info className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
              This DossierRequirement is added to the active ComplianceDossier only and does not change any template.
            </p>
          </aside>
        </div>

        <DialogFooter className="gap-2 border-t border-slate-200 px-6 py-4">
          <Button type="button" variant="outline" size="sm" disabled={isSaving} className="h-8 rounded-[2px] border-slate-300 bg-white px-4 font-heading text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-900 shadow-none" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="add-dossier-requirement-form" size="sm" disabled={isSaving || attempt.isBlocked} className="h-8 rounded-[2px] bg-[#ef8f00] px-4 font-heading text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-950 shadow-none hover:bg-[#db8300]">
            <Plus className="size-3.5" />
            {isSaving ? "Adding..." : attempt.isBlocked ? "Please wait..." : "Add requirement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
