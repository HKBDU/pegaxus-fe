import { zodResolver } from "@hookform/resolvers/zod"
import { useState, type ReactNode } from "react"
import { useForm, useWatch, type Control } from "react-hook-form"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { ComplianceActionDialog } from "@/features/compliance-catalog/components/ComplianceActionDialog"
import { COMPLIANCE_COUNTRIES } from "@/features/compliance-catalog/constants/countries"
import { useComplianceRequirement, useCreateComplianceRequirement, useUpdateComplianceRequirement } from "@/features/compliance-catalog/hooks"
import { complianceFormSchema, type ComplianceFormValues } from "@/features/compliance-catalog/schemas"
import { ComplianceApiError } from "@/features/compliance-catalog/services"
import {
  COMPLIANCE_CATEGORIES,
  type ComplianceRequirement,
  type ComplianceRequirementPayload,
  type ReferenceCount,
} from "@/features/compliance-catalog/types"
import { getComplianceCategoryLabel, getComplianceErrorMessage } from "@/features/compliance-catalog/utils"
import { ErrorState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form"
import { Input } from "@/shared/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Textarea } from "@/shared/components/ui/textarea"
import { useRequestAttemptGuard } from "@/shared/hooks/useRequestAttemptGuard"

const LIST_PATH = "/compliance-requirements"
/** Radix Select cannot hold an empty value, so "no country" travels as this sentinel. */
const NO_COUNTRY = "__none__"

const labelClass = "font-heading text-[11px] font-medium uppercase leading-4 tracking-[0.06em] text-[#181818]"
const controlClass =
  "h-9 w-full rounded-[2px] border-0 bg-[#f3f3f3] px-3 text-xs text-[#181818] shadow-none placeholder:text-[#8a8780] focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"

const emptyValues: ComplianceFormValues = {
  requirementCode: "",
  requirementName: "",
  country: "",
  category: undefined as unknown as ComplianceFormValues["category"],
  issuingAuthority: "",
  bcpCode: "",
  legalBasis: "",
  description: "",
  validityRequired: true,
  validityPeriodDays: "",
  status: "ACTIVE",
}

function toDefaultValues(requirement?: ComplianceRequirement): ComplianceFormValues {
  if (!requirement) return emptyValues
  return {
    requirementCode: requirement.requirementCode,
    requirementName: requirement.requirementName,
    country: requirement.country ?? "",
    category: requirement.category,
    issuingAuthority: requirement.issuingAuthority ?? "",
    bcpCode: requirement.bcpCode ?? "",
    legalBasis: requirement.legalBasis ?? "",
    description: requirement.description ?? "",
    validityRequired: requirement.validityRequired,
    validityPeriodDays: requirement.validityPeriodDays ? String(requirement.validityPeriodDays) : "",
    status: requirement.status,
  }
}

/** Optional text fields are omitted when blank so the BE stores null, not an empty string. */
const optional = (value: string) => value.trim() || undefined

function toPayload(values: ComplianceFormValues, acknowledgeReferenceImpact?: boolean): ComplianceRequirementPayload {
  return {
    requirementCode: values.requirementCode,
    requirementName: values.requirementName,
    description: optional(values.description),
    country: optional(values.country),
    category: values.category,
    issuingAuthority: optional(values.issuingAuthority),
    validityRequired: values.validityRequired,
    validityPeriodDays: values.validityRequired ? Number(values.validityPeriodDays) : undefined,
    bcpCode: optional(values.bcpCode),
    legalBasis: optional(values.legalBasis),
    status: values.status,
    ...(acknowledgeReferenceImpact ? { acknowledgeReferenceImpact: true } : {}),
  }
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="m-0! font-heading text-lg! leading-6! font-bold! tracking-[0.02em]! text-black! uppercase">{children}</h2>
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  ariaLabel: string
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="grid h-9 grid-flow-col auto-cols-fr bg-[#f3f3f3]">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "font-heading text-[11px] font-semibold uppercase tracking-[0.06em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary",
            option.value === value ? "bg-[#0b0b0b] text-white" : "text-[#8a8780] hover:text-[#181818]",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function TextField({
  control,
  name,
  label,
  placeholder,
  className,
}: {
  control: Control<ComplianceFormValues>
  name: "requirementCode" | "requirementName" | "issuingAuthority" | "bcpCode" | "legalBasis"
  label: string
  placeholder: string
  className?: string
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn("gap-1.5", className)}>
          <FormLabel className={labelClass}>{label}</FormLabel>
          <FormControl>
            <Input {...field} placeholder={placeholder} spellCheck={false} className={controlClass} />
          </FormControl>
          <FormMessage className="text-xs" />
        </FormItem>
      )}
    />
  )
}

interface ComplianceFormProps {
  mode: "create" | "edit"
  requirement?: ComplianceRequirement
}

function ComplianceForm({ mode, requirement }: ComplianceFormProps) {
  const navigate = useNavigate()
  const createRequirement = useCreateComplianceRequirement()
  const updateRequirement = useUpdateComplianceRequirement()
  const attempt = useRequestAttemptGuard()
  const [impact, setImpact] = useState<ReferenceCount | null>(null)
  const form = useForm<ComplianceFormValues>({
    resolver: zodResolver(complianceFormSchema),
    defaultValues: toDefaultValues(requirement),
  })
  const validityRequired = useWatch({ control: form.control, name: "validityRequired" })
  const isSaving = createRequirement.isPending || updateRequirement.isPending

  const save = async (values: ComplianceFormValues, acknowledgeReferenceImpact = false) => {
    try {
      const guarded = await attempt.run(async () => {
        if (mode === "edit" && requirement) {
          await updateRequirement.mutateAsync({
            id: requirement.complianceRequirementId,
            data: toPayload(values, acknowledgeReferenceImpact),
          })
        } else {
          await createRequirement.mutateAsync(toPayload(values))
        }
      })
      if (!guarded.started) return
      toast.success("ComplianceRequirement entry saved successfully.")
      navigate(LIST_PATH)
    } catch (error) {
      const code = error instanceof Error ? error.message : ""
      if (code === "DUPLICATE_REQUIREMENT_CODE") {
        setImpact(null)
        form.setError("requirementCode", { message: getComplianceErrorMessage(error, "This code is already used.") }, { shouldFocus: true })
        return
      }
      if (code === "REFERENCE_IMPACT_CONFIRMATION_REQUIRED" && error instanceof ComplianceApiError) {
        // The counts changed since the page loaded: reopen the warning with the latest numbers.
        attempt.reset()
        setImpact(error.referenceCount ?? requirement?.referenceCount ?? null)
        return
      }
      setImpact(null)
      toast.error(getComplianceErrorMessage(error, "Unable to save this requirement"))
    }
  }

  const onSubmit = form.handleSubmit((values) => {
    if (mode === "edit" && requirement?.isReferenced) {
      setImpact(requirement.referenceCount)
      return
    }
    return save(values)
  })

  const isEdit = mode === "edit"

  return (
    <div className="booking-page-shell min-h-[70dvh] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
      <div className="booking-page-enter mx-auto w-full max-w-[880px]">
        <PageHeader
          title={isEdit ? "EDIT COMPLIANCE REQUIREMENT" : "CREATE COMPLIANCE REQUIREMENT"}
          backHref={LIST_PATH}
          backLabel="RETURN TO COMPLIANCE REQUIREMENTS"
          action={
            <span className="hidden shrink-0 self-end pb-3 font-heading text-[10px] font-medium uppercase tracking-[0.1em] text-slate-500 sm:block">
              {isEdit ? "Update regulatory record" : "New regulatory record"}
            </span>
          }
        />

        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="booking-panel mt-4 border bg-white p-6 sm:p-7">
            <fieldset disabled={isSaving} className="grid gap-5">
              <SectionTitle>01. Identification &amp; classification</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField control={form.control} name="requirementCode" label="Requirement code" placeholder="e.g. CR-EQ-VET-01" />
                <TextField control={form.control} name="requirementName" label="Requirement name" placeholder="Enter requirement name" />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem className="gap-1.5">
                      <FormLabel className={labelClass}>Applicable country</FormLabel>
                      <Select value={field.value || NO_COUNTRY} onValueChange={(value) => field.onChange(value === NO_COUNTRY ? "" : value)}>
                        <FormControl>
                          <SelectTrigger className={cn(controlClass, "justify-between data-[placeholder]:text-[#8a8780]")}>
                            <SelectValue placeholder="Select jurisdiction / country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-72 rounded-[2px]">
                          <SelectItem value={NO_COUNTRY} className="text-xs">Shared (all routes)</SelectItem>
                          {COMPLIANCE_COUNTRIES.map((country) => (
                            <SelectItem key={country.code} value={country.code} className="text-xs">
                              {country.name} ({country.code})
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
                  name="category"
                  render={({ field }) => (
                    <FormItem className="gap-1.5">
                      <FormLabel className={labelClass}>Classification / category</FormLabel>
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className={cn(controlClass, "justify-between data-[placeholder]:text-[#8a8780]")}>
                            <SelectValue placeholder="Select classification" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-[2px]">
                          {COMPLIANCE_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category} className="text-xs">
                              {getComplianceCategoryLabel(category)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <SectionTitle>02. Legal basis &amp; enforcement</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField control={form.control} name="issuingAuthority" label="Issuing authority" placeholder="e.g. Department of Agriculture" />
                <TextField control={form.control} name="bcpCode" label="Applicable BCP code" placeholder="e.g. FR-CQF" />
                <TextField control={form.control} name="legalBasis" label="Legal basis" placeholder="e.g. EU Regulation 2020/688" className="sm:col-span-2" />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="gap-1.5 sm:col-span-2">
                      <FormLabel className={labelClass}>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={4} placeholder="Enter requirement details or notes" className={cn(controlClass, "h-auto min-h-24 resize-y py-2 leading-5")} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_1fr_1.4fr]">
                <FormField
                  control={form.control}
                  name="validityRequired"
                  render={({ field }) => (
                    <FormItem className="gap-1.5">
                      <FormLabel className={labelClass}>Validity</FormLabel>
                      <Segmented
                        ariaLabel="Validity required"
                        value={field.value ? "YES" : "NO"}
                        options={[{ value: "YES", label: "Required" }, { value: "NO", label: "Not required" }]}
                        onChange={(value) => {
                          field.onChange(value === "YES")
                          if (value === "NO") form.clearErrors("validityPeriodDays")
                        }}
                      />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="validityPeriodDays"
                  render={({ field }) => (
                    <FormItem className="gap-1.5">
                      <FormLabel className={labelClass}>Validity period (days)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          step={1}
                          disabled={!validityRequired}
                          placeholder={validityRequired ? "e.g. 30" : "—"}
                          className={controlClass}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="gap-1.5">
                      <FormLabel className={labelClass}>Status</FormLabel>
                      <Segmented
                        ariaLabel="Status"
                        value={field.value}
                        options={[{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }]}
                        onChange={field.onChange}
                      />
                    </FormItem>
                  )}
                />
              </div>

              <div className="mt-2 flex items-center justify-end gap-5">
                <button
                  type="button"
                  className="font-heading text-xs font-semibold uppercase tracking-[0.06em] text-[#181818] hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  onClick={() => navigate(LIST_PATH)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || attempt.isBlocked}
                  className="inline-flex h-10 items-center justify-center rounded-[2px] bg-[#ef8f00] px-8 font-heading text-xs font-semibold uppercase tracking-[0.06em] text-slate-950 transition-colors hover:bg-[#db8300] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : attempt.isBlocked ? "Please wait..." : isEdit ? "Save requirement" : "Create requirement"}
                </button>
              </div>
            </fieldset>
          </form>
        </Form>
      </div>

      <ComplianceActionDialog
        variant={impact ? "edit-impact" : null}
        requirementCode={requirement?.requirementCode}
        referenceCount={impact ?? undefined}
        isPending={isSaving}
        onConfirm={() => void form.handleSubmit((values) => save(values, true))()}
        onOpenChange={(open) => !open && setImpact(null)}
      />
    </div>
  )
}

function ComplianceFormSkeleton() {
  return (
    <div className="booking-page-shell min-h-[70dvh] px-5 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="mx-auto w-full max-w-[880px] space-y-4">
        <Skeleton className="h-16 rounded-none bg-[#e9e6de]" />
        <Skeleton className="h-[520px] rounded-none bg-[#e9e6de]" />
      </div>
    </div>
  )
}

/** SCR-F2-002 */
export default function ComplianceFormPage({ mode }: { mode: "create" | "edit" }) {
  const { complianceRequirementId } = useParams()
  const query = useComplianceRequirement(mode === "edit" ? complianceRequirementId : undefined)

  if (mode === "create") return <ComplianceForm mode="create" />
  if (query.isLoading) return <ComplianceFormSkeleton />
  if (query.isError || !query.data) {
    return (
      <div className="booking-page-shell min-h-[70dvh] px-5 py-8 sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto w-full max-w-[880px]">
          <ErrorState message={getComplianceErrorMessage(query.error, "Unable to load this compliance requirement.")} onRetry={() => void query.refetch()} />
        </div>
      </div>
    )
  }

  // key: switching to another record must remount the form so it picks up that record's defaults.
  return <ComplianceForm key={String(query.data.complianceRequirementId)} mode="edit" requirement={query.data} />
}
