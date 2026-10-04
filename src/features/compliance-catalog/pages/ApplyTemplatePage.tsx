import { ArrowLeft, ArrowRight, Check, FileX2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { ApplyStepper } from "@/features/compliance-catalog/components/ApplyStepper"
import { BookingSummaryCard } from "@/features/compliance-catalog/components/BookingSummaryCard"
import { CustomizeRequirementsStep } from "@/features/compliance-catalog/components/CustomizeRequirementsStep"
import { RequirementCountTiles } from "@/features/compliance-catalog/components/RequirementCountTiles"
import { ReviewDossierStep } from "@/features/compliance-catalog/components/ReviewDossierStep"
import { SelectTemplateStep } from "@/features/compliance-catalog/components/SelectTemplateStep"
import {
  useActiveRequirementOptions,
  useBookingForDossier,
  useCreateDossier,
  useDossierTemplate,
  useExistingDossier,
} from "@/features/compliance-catalog/hooks"
import type { CustomRequirementDraft } from "@/features/compliance-catalog/dossier-types"
import { buildFinalRows, countRows, templateItemKey } from "@/features/compliance-catalog/dossier-utils"
import { getDossierErrorMessage } from "@/features/compliance-catalog/template-utils"
import { ErrorState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useRequestAttemptGuard } from "@/shared/hooks/useRequestAttemptGuard"
import type { EntityId } from "@/shared/types"

const AFTER_CREATE_PATH = (dossierId: EntityId) => `/compliance-dossiers/${dossierId}/requirements`

const outlineButtonClass =
  "inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-[2px] border border-slate-300 bg-white px-3 font-heading text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-900 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-60"
const primaryButtonClass =
  "inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-[2px] bg-[#ef8f00] px-3 font-heading text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-950 transition-colors hover:bg-[#db8300] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-60"

const STEP_TEXT = {
  1: { title: "APPLY DOSSIER TEMPLATE", subtitle: "Select a dossier template to create a compliance dossier and its required documents for this booking." },
  2: { title: "CUSTOMIZE DOSSIER REQUIREMENTS", subtitle: "Adjust the selected template requirements for this booking before creating the compliance dossier." },
  3: { title: "REVIEW AND CREATE COMPLIANCE DOSSIER", subtitle: "Review the final dossier requirements based on the selected template and booking details. Confirm to create the ComplianceDossier." },
} as const

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="booking-page-shell min-h-[70dvh] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1280px]">{children}</div>
    </div>
  )
}

function BlockedNotice({ title, message }: { title: string; message: string }) {
  return (
    <PageShell>
      <div role="alert" className="mx-auto mt-10 grid max-w-xl justify-items-center gap-2 rounded-[2px] border border-slate-200 bg-white p-8 text-center">
        <FileX2 className="size-8 text-amber-600" aria-hidden="true" />
        <h1 className="m-0! font-heading text-xl! font-bold! tracking-normal! text-slate-900! uppercase">{title}</h1>
        <p className="m-0 text-sm text-slate-600">{message}</p>
      </div>
    </PageShell>
  )
}

/** SCR-F2-007: three-step wizard that creates the ComplianceDossier of an APPROVED booking (UC-18). */
export default function ApplyTemplatePage() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const bookingQuery = useBookingForDossier(bookingId)
  const existingQuery = useExistingDossier(bookingId)
  const requirementsQuery = useActiveRequirementOptions()
  const createDossier = useCreateDossier()
  const attempt = useRequestAttemptGuard()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [mode, setMode] = useState<"template" | "custom">("template")
  const [templateId, setTemplateId] = useState<EntityId | null>(null)
  const [initializedFor, setInitializedFor] = useState<EntityId | null>(null)
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [customs, setCustoms] = useState<CustomRequirementDraft[]>([])

  const templateQuery = useDossierTemplate(mode === "template" ? (templateId ?? undefined) : undefined)
  const template = mode === "template" ? (templateQuery.data ?? null) : null
  const booking = bookingQuery.data
  const requirements = useMemo(() => requirementsQuery.data ?? [], [requirementsQuery.data])

  const categoryById = useMemo(
    () => new Map(requirements.map((requirement) => [String(requirement.complianceRequirementId), requirement.category] as const)),
    [requirements],
  )
  const categoryOf = useCallback((id: EntityId) => categoryById.get(String(id)) ?? null, [categoryById])

  const finalRows = useMemo(
    () => buildFinalRows(template?.items ?? [], selectedItemIds, customs, booking?.horses ?? [], categoryOf),
    [booking?.horses, categoryOf, customs, selectedItemIds, template],
  )
  const counts = useMemo(() => countRows(finalRows), [finalRows])

  useEffect(() => {
    if (existingQuery.data) {
      navigate(`/compliance-dossiers/${existingQuery.data.complianceDossierId}/requirements`, { replace: true })
    }
  }, [existingQuery.data, navigate])

  const toggleItem = useCallback((key: string) => {
    setSelectedItemIds((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const toggleAll = useCallback(
    (checked: boolean) => setSelectedItemIds(checked ? new Set((template?.items ?? []).map(templateItemKey)) : new Set()),
    [template],
  )

  // DR_DUPLICATE guard: the same requirement cannot be asked twice for the same horse (or twice for the trip).
  const addCustom = useCallback(
    (draft: CustomRequirementDraft) => {
      const sameCustom = customs.some(
        (item) => String(item.complianceRequirementId) === String(draft.complianceRequirementId) && String(item.horseId) === String(draft.horseId),
      )
      const sameTemplateLine = (template?.items ?? []).some((item) => {
        if (!selectedItemIds.has(templateItemKey(item)) || String(item.complianceRequirementId) !== String(draft.complianceRequirementId)) return false
        return item.appliesPerHorse ? draft.horseId !== null : draft.horseId === null
      })
      if (sameCustom || sameTemplateLine) return "This requirement is already included for the same horse or trip."
      setCustoms((current) => [...current, draft])
      return null
    },
    [customs, selectedItemIds, template],
  )

  const removeCustom = useCallback((key: string) => setCustoms((current) => current.filter((item) => item.key !== key)), [])

  const goToCustomize = (nextMode: "template" | "custom") => {
    setMode(nextMode)
    if (nextMode === "template" && template && initializedFor !== template.dossierTemplateId) {
      setSelectedItemIds(new Set(template.items.map(templateItemKey)))
      setInitializedFor(template.dossierTemplateId)
    }
    setStep(2)
  }

  const confirm = async () => {
    if (!booking) return
    try {
      const guarded = await attempt.run(() =>
        createDossier.mutateAsync({
          bookingId: booking.bookingId,
          dossierTemplateId: mode === "template" ? (template?.dossierTemplateId ?? undefined) : undefined,
          selectedTemplateItemIds: (template?.items ?? []).filter((item) => selectedItemIds.has(templateItemKey(item))).map((item) => item.dossierTemplateItemId as EntityId),
          customRequirements: customs,
        }),
      )
      if (!guarded.started) return
      toast.success("ComplianceDossier initialized successfully. DossierRequirements generated for customer.")
      if (guarded.value.failedCustomCount > 0) {
        toast.warning(`${guarded.value.failedCustomCount} custom requirement(s) could not be added. Add them again from the dossier page.`)
      }
      navigate(AFTER_CREATE_PATH(guarded.value.complianceDossierId))
    } catch (error) {
      const code = error instanceof Error ? error.message : ""
      // The booking changed behind our back: re-read it so the page shows the real state instead of a stale wizard.
      if (code === "BOOKING_NOT_APPROVED" || code === "DOSSIER_ALREADY_EXISTS" || code === "BOOKING_CHANGE_IN_PROGRESS" || code === "DOSSIER_CLOSED") {
        void bookingQuery.refetch()
        void existingQuery.refetch()
      }
      toast.error(getDossierErrorMessage(error, "Unable to create the ComplianceDossier"))
    }
  }

  if (bookingQuery.isLoading || existingQuery.isLoading) {
    return (
      <PageShell>
        <div className="grid gap-4">
          <Skeleton className="h-16 rounded-none bg-[#e9e6de]" />
          <Skeleton className="h-24 rounded-none bg-[#e9e6de]" />
          <Skeleton className="h-96 rounded-none bg-[#e9e6de]" />
        </div>
      </PageShell>
    )
  }

  if (bookingQuery.isError || !booking) {
    const httpStatus = (bookingQuery.error as { response?: { status?: number } } | null)?.response?.status
    if (httpStatus === 404) {
      return <BlockedNotice title="Booking not found" message={`There is no booking with ID ${bookingId} in the system. Open this page with the ID of an APPROVED booking.`} />
    }
    if (httpStatus === 403) {
      return <BlockedNotice title="No access" message="You are not allowed to view this booking." />
    }
    return (
      <PageShell>
        <ErrorState message="Unable to load this booking." onRetry={() => void bookingQuery.refetch()} />
      </PageShell>
    )
  }

  if (existingQuery.isError) {
    return (
      <PageShell>
        <ErrorState message="Unable to check whether this booking already has a dossier." onRetry={() => void existingQuery.refetch()} />
      </PageShell>
    )
  }

  if (booking.status !== "APPROVED") {
    return <BlockedNotice title="Booking not approved" message="ComplianceDossier can only be initialized for APPROVED transport bookings." />
  }

  if (existingQuery.data) {
    return (
      <PageShell>
        <div className="mx-auto mt-10 grid max-w-xl justify-items-center gap-2 rounded-[2px] border border-slate-200 bg-white p-8 text-center">
          <Check className="size-8 text-emerald-600" aria-hidden="true" />
          <h1 className="m-0! font-heading text-xl! font-bold! tracking-normal! text-slate-900! uppercase">Opening ComplianceDossier</h1>
          <p className="m-0 text-sm text-slate-600">Dossier {existingQuery.data.dossierCode} already exists. Opening its requirements.</p>
        </div>
      </PageShell>
    )
  }

  const text = STEP_TEXT[step]
  const noRequirements = counts.total === 0
  const isCreating = createDossier.isPending

  return (
    <PageShell>
      <PageHeader
        title={text.title}
        showBack={false}
        backHref="/"
        action={
          step === 1 ? (
            <div className="flex shrink-0 items-center gap-2 self-center">
              <button type="button" className={outlineButtonClass} onClick={() => goToCustomize("custom")}>Create custom without template</button>
              <button type="button" className={primaryButtonClass} disabled={templateId === null || templateQuery.isLoading || !template} onClick={() => goToCustomize("template")}>
                <Check className="size-3.5" />
                Select template
              </button>
            </div>
          ) : undefined
        }
      />
      <p className="m-0! mb-8! mt-1! max-w-3xl text-sm text-slate-500">{text.subtitle}</p>

      <div className="mb-5"><ApplyStepper step={step} /></div>
      {step === 2 ? null : <div className="mb-5"><BookingSummaryCard booking={booking} /></div>}

      {step === 1 ? <SelectTemplateStep bookingId={booking.bookingId} selectedId={templateId} onSelect={setTemplateId} /> : null}

      {step === 2 ? (
        <>
          <div className="mb-4 grid gap-4">
            <section aria-labelledby="booking-information-title">
              <h2 id="booking-information-title" className="sr-only">Booking Information</h2>
              <BookingSummaryCard booking={booking} />
            </section>
            <section className="min-w-0" aria-labelledby="current-summary-title">
              <h2 id="current-summary-title" className="m-0! font-heading text-sm! leading-5! font-bold! tracking-[0.04em]! text-[#ef8f00]! uppercase">Current Summary</h2>
              <p className="m-0 mb-3 mt-0.5 text-xs text-slate-500">Overview of the requirements this dossier will contain.</p>
              <RequirementCountTiles total={counts.total} horse={counts.horse} trip={counts.trip} />
            </section>
          </div>
          <CustomizeRequirementsStep
            booking={booking}
            template={template}
            templateLoading={mode === "template" && templateQuery.isLoading}
            selectedItemIds={selectedItemIds}
            onToggleItem={toggleItem}
            onToggleAll={toggleAll}
            customs={customs}
            onAddCustom={addCustom}
            onRemoveCustom={removeCustom}
            requirements={requirements}
            requirementsLoading={requirementsQuery.isLoading}
            showSummary={false}
          />
          <div className="mt-6 flex items-center justify-between gap-2 border-t border-slate-200 pt-4">
            <button type="button" className={outlineButtonClass} onClick={() => setStep(1)}>
              <ArrowLeft className="size-3.5" />
              Back to templates
            </button>
            <button type="button" className={primaryButtonClass} disabled={noRequirements} onClick={() => setStep(3)}>
              Continue to review
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <ReviewDossierStep booking={booking} template={template} rows={finalRows} counts={counts} />
          <div className="mt-6 flex items-center justify-between gap-2 border-t border-slate-200 pt-4">
            <button type="button" className={outlineButtonClass} disabled={isCreating} onClick={() => setStep(2)}>
              <ArrowLeft className="size-3.5" />
              Back to customize
            </button>
            <button type="button" className={primaryButtonClass} disabled={isCreating || attempt.isBlocked || noRequirements} onClick={() => void confirm()}>
              <Check className="size-3.5" />
              {isCreating ? "Creating..." : attempt.isBlocked ? "Please wait..." : "Confirm & create ComplianceDossier"}
            </button>
          </div>
        </>
      ) : null}
    </PageShell>
  )
}
