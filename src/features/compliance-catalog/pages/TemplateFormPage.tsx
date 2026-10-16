import { zodResolver } from "@hookform/resolvers/zod"
import { Lock } from "lucide-react"
import { useMemo } from "react"
import { useForm, useWatch } from "react-hook-form"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { useActiveRequirementOptions, useCreateDossierTemplate, useDossierTemplate, useUpdateDossierTemplate } from "@/features/compliance-catalog/hooks"
import { templateFormSchema, type TemplateFormValues } from "@/features/compliance-catalog/template-schemas"
import { TEMPLATE_STATUSES, type DossierTemplate, type DossierTemplatePayload, type TemplateStatus } from "@/features/compliance-catalog/template-types"
import { getTemplateErrorMessage, getTemplateStatusLabel } from "@/features/compliance-catalog/template-utils"
import { newTemplateItem, TemplateItemsEditor, templateControlClass as controlClass, templateSectionTitleClass as sectionTitleClass, type RequirementOption } from "@/features/compliance-catalog/components/TemplateItemsEditor"
import { ErrorState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form"
import { Input } from "@/shared/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Textarea } from "@/shared/components/ui/textarea"
import { useRequestAttemptGuard } from "@/shared/hooks/useRequestAttemptGuard"

const LIST_PATH = "/dossier-templates"
const DESCRIPTION_LIMIT = 500

const labelClass = "text-xs font-medium leading-4 text-slate-700"
const outlineButtonClass =
  "inline-flex h-8 items-center justify-center whitespace-nowrap rounded-[2px] border border-slate-300 bg-white px-3 font-heading text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-900 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-60"

function toDefaultValues(template?: DossierTemplate): TemplateFormValues {
  if (!template) {
    return { templateCode: "", templateName: "", description: "", status: "DRAFT", effectiveFrom: "", effectiveTo: "", items: [newTemplateItem(1)] }
  }
  return {
    templateCode: template.templateCode,
    templateName: template.templateName,
    description: template.description ?? "",
    status: template.status,
    effectiveFrom: template.effectiveFrom ?? "",
    effectiveTo: template.effectiveTo ?? "",
    items: [...template.items]
      .sort((left, right) => left.sequenceNo - right.sequenceNo)
      .map((item, index) => ({
        complianceRequirementId: String(item.complianceRequirementId),
        // Sequence numbers are automatic: always 1..n in the order shown.
        sequenceNo: String(index + 1),
        isMandatory: item.isMandatory,
        appliesPerHorse: item.appliesPerHorse,
        isEditing: false,
        instruction: item.instruction ?? "",
      })),
  }
}

/** Optional text fields are omitted when blank so the BE stores null, not an empty string. */
const optional = (value: string) => value.trim() || undefined

function toPayload(values: TemplateFormValues, status: TemplateStatus): DossierTemplatePayload {
  return {
    templateCode: values.templateCode,
    templateName: values.templateName,
    description: optional(values.description),
    status,
    effectiveFrom: optional(values.effectiveFrom),
    effectiveTo: optional(values.effectiveTo),
    items: values.items.map((item) => ({
      // ComplianceRequirement IDs are GUIDs in the backend; do not coerce them to numbers.
      complianceRequirementId: item.complianceRequirementId,
      sequenceNo: Number(item.sequenceNo),
      isMandatory: item.isMandatory,
      appliesPerHorse: item.appliesPerHorse,
      instruction: optional(item.instruction),
    })),
  }
}

/** Label above the control; every field in the info card shares the same label, gap and 36px control height. */
function FieldRow({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <FormItem className={cn("min-w-0 content-start gap-1.5", className)}>
      <FormLabel className={labelClass}>
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </FormLabel>
      {children}
      <FormMessage className="text-xs" />
    </FormItem>
  )
}

function TemplateForm({ mode, template }: { mode: "create" | "edit"; template?: DossierTemplate }) {
  const navigate = useNavigate()
  const createTemplate = useCreateDossierTemplate()
  const updateTemplate = useUpdateDossierTemplate()
  const requirementsQuery = useActiveRequirementOptions()
  const attempt = useRequestAttemptGuard()
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: toDefaultValues(template),
  })
  const description = useWatch({ control: form.control, name: "description" })
  const effectiveFrom = useWatch({ control: form.control, name: "effectiveFrom" })
  const isEdit = mode === "edit"
  const isSaving = createTemplate.isPending || updateTemplate.isPending
  const locked = isEdit && template?.canDelete === false

  const options = useMemo<RequirementOption[]>(() => {
    const active = (requirementsQuery.data ?? []).map((requirement) => ({
      id: String(requirement.complianceRequirementId),
      label: `${requirement.requirementCode} — ${requirement.requirementName}`,
      name: requirement.requirementName,
    }))
    // A template may still hold a requirement that was deactivated later: keep it selectable so the row is not blank.
    const known = new Set(active.map((option) => option.id))
    const legacy = (template?.items ?? [])
      .filter((item) => !known.has(String(item.complianceRequirementId)))
      .map((item) => ({ id: String(item.complianceRequirementId), label: `${item.requirementName} (inactive)`, name: item.requirementName }))
    return [...active, ...legacy]
  }, [requirementsQuery.data, template])
  const fallbackNames = useMemo(() => new Map((template?.items ?? []).map((item) => [String(item.complianceRequirementId), item.requirementName])), [template])

  const save = async (values: TemplateFormValues, status: TemplateStatus) => {
    try {
      const guarded = await attempt.run(async () => {
        const data = toPayload(values, status)
        if (isEdit && template) await updateTemplate.mutateAsync({ id: template.dossierTemplateId, data })
        else await createTemplate.mutateAsync(data)
      })
      if (!guarded.started) return
      toast.success("DossierTemplate saved successfully.")
      navigate(LIST_PATH)
    } catch (error) {
      if (error instanceof Error && error.message === "DUPLICATE_TEMPLATE_CODE") {
        form.setError("templateCode", { message: getTemplateErrorMessage(error, "This code is already used.") }, { shouldFocus: true })
        return
      }
      toast.error(getTemplateErrorMessage(error, "Unable to save this template"))
    }
  }

  const onSubmit = form.handleSubmit((values) => save(values, values.status))
  const onSaveDraft = form.handleSubmit((values) => save(values, "DRAFT"))
  const statusOptions = isEdit ? TEMPLATE_STATUSES : TEMPLATE_STATUSES.filter((status) => status !== "INACTIVE")

  return (
    <div className="booking-page-shell min-h-[70dvh] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1100px]">
        <div className="mb-8">
          <PageHeader title={isEdit ? "EDIT DOSSIER TEMPLATE" : "CREATE DOSSIER TEMPLATE"} backHref={LIST_PATH} backLabel="Back to Templates" />
          <p className="m-0 mt-3 text-sm text-slate-500">
            {isEdit ? "Update template metadata and maintain dossier requirement items." : "Create a reusable dossier template for legal and compliance requirements."}
          </p>
        </div>

        {locked ? (
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-[2px] border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
            <Lock className="mt-0.5 size-3.5 shrink-0" />
            <p className="m-0">
              This template is already used by {template?.referenceCount?.complianceDossierCount ?? "existing"} ComplianceDossier(s) and cannot be edited. Change its status to INACTIVE from the template list instead.
            </p>
          </div>
        ) : null}

        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="grid grid-cols-[minmax(0,1fr)] gap-4">
            <fieldset disabled={isSaving || locked} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
              <section className="booking-panel border bg-white p-5 sm:p-6">
                <h2 className={cn(sectionTitleClass, "mb-6!")}>Template Information</h2>
                <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
                  <FormField control={form.control} name="templateName" render={({ field }) => (
                    <FieldRow label="Template Name" required className="sm:col-span-2">
                      <FormControl><Input {...field} placeholder="e.g. UK-to-EU Cross-Border Racehorse Master Template" className={controlClass} /></FormControl>
                    </FieldRow>
                  )} />
                  <FormField control={form.control} name="templateCode" render={({ field }) => (
                    <FieldRow label="Template Code" required className="sm:col-span-2">
                      <FormControl><Input {...field} placeholder="e.g. DT-UK-EU-01" spellCheck={false} className={controlClass} /></FormControl>
                    </FieldRow>
                  )} />

                  <FormField control={form.control} name="effectiveFrom" render={({ field }) => (
                    <FieldRow label="Effective From" className="sm:col-span-1 lg:col-span-2">
                      <FormControl>
                        <DatePicker ref={field.ref} value={field.value} onChange={field.onChange} onBlur={field.onBlur} placeholder="Select date" className={cn(controlClass, "data-[empty=true]:text-slate-400")} />
                      </FormControl>
                    </FieldRow>
                  )} />
                  <FormField control={form.control} name="effectiveTo" render={({ field }) => (
                    <FieldRow label="Effective To" className="sm:col-span-1 lg:col-span-2">
                      <FormControl>
                        <DatePicker ref={field.ref} value={field.value} onChange={field.onChange} onBlur={field.onBlur} minDate={effectiveFrom || undefined} placeholder="Optional" className={cn(controlClass, "data-[empty=true]:text-slate-400")} />
                      </FormControl>
                    </FieldRow>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FieldRow label="Status" required className="sm:col-span-1 lg:col-span-2">
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className={cn(controlClass, "justify-between data-[size=default]:h-9")}><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-[2px]">
                          {statusOptions.map((status) => <SelectItem key={status} value={status} className="text-xs">{getTemplateStatusLabel(status)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FieldRow>
                  )} />
                  {isEdit ? (
                    <FormItem className="min-w-0 content-start gap-1.5 sm:col-span-1 lg:col-span-2">
                      <FormLabel className={labelClass}>Version No</FormLabel>
                      <Input value={template ? `v${template.versionNo}` : ""} readOnly disabled title="Incremented automatically when you save changes" className={cn(controlClass, "bg-slate-50")} />
                    </FormItem>
                  ) : null}

                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FieldRow label="Description" className="sm:col-span-2 lg:col-span-4">
                      <FormControl>
                        <Textarea {...field} rows={2} maxLength={DESCRIPTION_LIMIT} placeholder="Describe when this template should be used" className={cn(controlClass, "h-auto max-h-36 min-h-14 resize-none overflow-y-auto py-2 leading-5")} />
                      </FormControl>
                      <span className="text-right text-[0.7rem] text-slate-400">{description.length}/{DESCRIPTION_LIMIT}</span>
                    </FieldRow>
                  )} />
                </div>
              </section>

              <TemplateItemsEditor form={form} options={options} optionsLoading={requirementsQuery.isLoading} fallbackNames={fallbackNames} readOnly={locked} />
            </fieldset>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button type="button" className={outlineButtonClass} disabled={isSaving} onClick={() => navigate(LIST_PATH)}>Cancel</button>
              {!isEdit ? (
                <button type="button" className={outlineButtonClass} disabled={isSaving || attempt.isBlocked} onClick={() => void onSaveDraft()}>Save Draft</button>
              ) : null}
              {!locked ? (
                <button
                  type="submit"
                  disabled={isSaving || attempt.isBlocked}
                  className="inline-flex h-8 items-center justify-center rounded-[2px] bg-[#ef8f00] px-3 font-heading text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-950 transition-colors hover:bg-[#db8300] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : attempt.isBlocked ? "Please wait..." : isEdit ? "Save Changes" : "Create Template"}
                </button>
              ) : null}
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}

function TemplateFormSkeleton() {
  return (
    <div className="booking-page-shell min-h-[70dvh] px-5 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="mx-auto w-full max-w-[1100px] space-y-4">
        <Skeleton className="h-16 rounded-none bg-[#e9e6de]" />
        <Skeleton className="h-72 rounded-none bg-[#e9e6de]" />
        <Skeleton className="h-72 rounded-none bg-[#e9e6de]" />
      </div>
    </div>
  )
}

/** SCR-F2-005 */
export default function TemplateFormPage({ mode }: { mode: "create" | "edit" }) {
  const { dossierTemplateId } = useParams()
  const query = useDossierTemplate(mode === "edit" ? dossierTemplateId : undefined)

  if (mode === "create") return <TemplateForm mode="create" />
  if (query.isLoading) return <TemplateFormSkeleton />
  if (query.isError || !query.data) {
    return (
      <div className="booking-page-shell min-h-[70dvh] px-5 py-8 sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto w-full max-w-[1100px]">
          <ErrorState message={getTemplateErrorMessage(query.error, "Unable to load this dossier template.")} onRetry={() => void query.refetch()} />
        </div>
      </div>
    )
  }

  // key: switching to another record must remount the form so it picks up that record's defaults.
  return <TemplateForm key={String(query.data.dossierTemplateId)} mode="edit" template={query.data} />
}
