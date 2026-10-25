import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { claimDetail } from "@/app/route-config"
import { canAccess } from "@/features/auth/access-control"
import { useAuthStore } from "@/features/auth/store"
import { ClaimBillingPanel } from "@/features/claim/components/ClaimBillingPanel"
import { ClaimHandoverCard, ClaimInformationCard, ClaimSummaryStrip } from "@/features/claim/components/ClaimDetailSections"
import {
  CardTitle,
  controlClass,
  dangerButtonClass,
  FieldError,
  fieldLabelClass,
  outlineButtonClass,
  panelClass,
  primaryButtonClass,
  textareaClass,
} from "@/features/claim/components/ClaimPrimitives"
import { AMOUNT_FORBIDDEN_RESOLUTIONS, RESOLUTION_TYPES, RESOLUTION_TYPE_LABELS } from "@/features/claim/constants"
import { openCreditNoteForm } from "@/features/claim/credit-note"
import { ClaimApiError, getClaimErrorCode, getClaimErrorMessage } from "@/features/claim/errors"
import { useClaim, useCompleteClaim, useResolveClaim } from "@/features/claim/hooks"
import { emptyResolveClaimValues, resolveClaimSchema, toResolvePayload, type ResolveClaimValues } from "@/features/claim/schemas"
import type { Claim } from "@/features/claim/types"
import { formatInvoiceDateTime, formatMoney } from "@/features/invoice/utils"
import { cn } from "@/lib/utils"
import { ErrorState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"
import { Button } from "@/shared/components/ui/button"
import { MoneyInput } from "@/shared/components/ui/money-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Textarea } from "@/shared/components/ui/textarea"

const STALE_CODES = ["CLAIM_MODIFIED", "INVALID_CLAIM_STATUS", "CLAIM_ALREADY_RESOLVED"]

type Intent = "approve" | "reject" | "resolve"

/** screen §10B, resolve mode (Logistics Manager): the decision form next to the facts needed to take it. */
export default function ClaimResolvePage() {
  const principal = useAuthStore((state) => state.principal)
  const { claimId = "" } = useParams()
  const location = useLocation()
  const allowed = canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })
  const query = useClaim(allowed ? claimId : undefined)
  const claim = query.data
  const listSearch = (location.state as { listSearch?: string } | null)?.listSearch ?? ""
  const detailTo = { pathname: claimDetail(claimId) }

  if (!allowed) return <ErrorState message="Only Logistics Managers can access claims." />

  return (
    <div className="min-h-[70dvh] bg-[#f4f2ed] px-5 pt-5 pb-8 sm:px-6 lg:px-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1152px]">
        <div className="mb-3">
          <PageHeader title="RESOLVE CLAIM" backHref={detailTo.pathname} backLabel="BACK TO CLAIM DETAILS" />
        </div>
        {query.isLoading ? <Skeleton className="h-64 w-full rounded-none bg-white" /> : null}
        {query.isError ? <ErrorState message={getClaimErrorMessage(query.error, "Unable to load this claim.")} onRetry={() => void query.refetch()} /> : null}
        {claim ? <ResolveBody key={`${claim.claimId}-${claim.updatedAt}`} claim={claim} listSearch={listSearch} onReload={() => void query.refetch()} /> : null}
      </div>
    </div>
  )
}

function ResolveBody({ claim, listSearch, onReload }: { claim: Claim; listSearch: string; onReload: () => void }) {
  const navigate = useNavigate()
  const resolve = useResolveClaim(claim.claimId)
  const complete = useCompleteClaim(claim.claimId)
  const [error, setError] = useState<unknown>()
  const [staleOpen, setStaleOpen] = useState(false)
  const [confirm, setConfirm] = useState<"resolve" | "complete" | null>(null)
  const [busy, setBusy] = useState(false)

  const canResolve = claim.availableActions.includes("RESOLVE")
  const canComplete = claim.availableActions.includes("COMPLETE")
  const canCreditNote = claim.availableActions.includes("CREATE_CREDIT_NOTE")

  const form = useForm<ResolveClaimValues>({
    resolver: zodResolver(resolveClaimSchema),
    defaultValues: claim.resolution
      ? {
          resolutionType: claim.resolution.resolutionType,
          approvedCompensationAmount: claim.resolution.approvedCompensationAmount == null ? "" : String(claim.resolution.approvedCompensationAmount),
          resolutionSummary: claim.resolution.resolutionSummary,
          correctiveAction: claim.resolution.correctiveAction ?? "",
          internalNote: claim.resolution.internalNote ?? "",
        }
      : emptyResolveClaimValues,
    mode: "onTouched",
  })
  const { control, register, handleSubmit, setValue, setError: setFieldError, watch, formState: { errors } } = form
  const resolutionType = watch("resolutionType")
  const noAmount = AMOUNT_FORBIDDEN_RESOLUTIONS.includes(resolutionType)
  const pending = busy || resolve.isPending || complete.isPending
  const editable = canResolve && !pending
  const toDetail = () => navigate(claimDetail(claim.claimId), { replace: true, state: { listSearch } })

  // BE field errors (400) go under their inputs.
  useEffect(() => {
    if (!(error instanceof ClaimApiError)) return
    error.errors?.forEach(({ field, message }) => {
      const name = field.replace(/^\w/, (char) => char.toLowerCase())
      if (name in emptyResolveClaimValues) setFieldError(name as keyof ResolveClaimValues, { type: "server", message })
    })
  }, [error, setFieldError])

  function fail(failure: unknown) {
    if (STALE_CODES.includes(getClaimErrorCode(failure) ?? "")) return setStaleOpen(true)
    setError(failure)
  }

  const submit = (intent: Intent) => {
    if (intent === "reject") {
      setValue("resolutionType", "NO_COMPENSATION")
      setValue("approvedCompensationAmount", "")
    }
    void handleSubmit(async (values) => {
      setError(undefined)
      setBusy(true)
      try {
        const saved = await resolve.mutateAsync(toResolvePayload(values, claim.updatedAt))
        if (intent === "resolve") {
          // Approve and settle in one go: CL7 is only valid on an APPROVED claim, so it uses the version CL5 returned.
          try {
            await complete.mutateAsync(saved.updatedAt)
            toast.success(`Claim ${saved.claimCode} resolved`)
            toDetail()
          } catch (failure) {
            toast.warning(`Claim ${saved.claimCode} was approved, but it could not be marked as resolved yet.`)
            fail(failure)
          }
        } else if (intent === "reject") {
          toast.success(`Claim ${saved.claimCode} rejected`)
          toDetail()
        } else {
          toast.success(`Claim ${saved.claimCode} approved`)
        }
      } catch (failure) {
        fail(failure)
      } finally {
        setBusy(false)
        setConfirm(null)
      }
    })()
  }

  async function markCompleted() {
    setError(undefined)
    setBusy(true)
    try {
      const saved = await complete.mutateAsync(claim.updatedAt)
      toast.success(`Claim ${saved.claimCode} resolved`)
      toDetail()
    } catch (failure) {
      fail(failure)
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  if (!canResolve && !canComplete) {
    return (
      <div className={cn(panelClass, "space-y-3 p-4")} role="status">
        <CardTitle>Nothing to resolve</CardTitle>
        <p className="text-xs text-gray-700">This claim is {claim.status.toLowerCase()} and can no longer be changed.</p>
        <Button asChild variant="outline" className={outlineButtonClass}>
          <Link to={claimDetail(claim.claimId)} state={{ listSearch }}>Back to claim details</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="grid items-start gap-2.5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-2.5">
          <ClaimSummaryStrip claim={claim} />
          <ClaimInformationCard claim={claim} />
          <ClaimHandoverCard claim={claim} />
          {claim.billing ? <ClaimBillingPanel billing={claim.billing} /> : null}
        </div>

        <aside aria-label="Claim resolution" className={cn(panelClass, "space-y-3 p-4 lg:sticky lg:top-4")}>
          <CardTitle>Claim resolution</CardTitle>
          {!canResolve ? (
            <p className="text-xs text-gray-600">This claim is already approved. Confirm below once the compensation has been carried out.</p>
          ) : null}
          <form noValidate className="space-y-3" onSubmit={(event) => event.preventDefault()}>
            <div>
              <label className={fieldLabelClass} htmlFor="resolution-type">Resolution type <span className="text-red-500">*</span></label>
              <Controller
                control={control}
                name="resolutionType"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value)
                      if (AMOUNT_FORBIDDEN_RESOLUTIONS.includes(value as ResolveClaimValues["resolutionType"])) setValue("approvedCompensationAmount", "")
                    }}
                    disabled={!editable}
                  >
                    <SelectTrigger id="resolution-type" className={controlClass}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RESOLUTION_TYPES.map((type) => <SelectItem key={type} value={type}>{RESOLUTION_TYPE_LABELS[type]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.resolutionType?.message} />
            </div>
            <div>
              <label className={fieldLabelClass} htmlFor="resolution-amount">Approved compensation (VND)</label>
              <Controller
                control={control}
                name="approvedCompensationAmount"
                render={({ field }) => (
                  <MoneyInput
                    id="resolution-amount"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    className={cn(controlClass, "text-right font-semibold")}
                    placeholder={noAmount ? "Not applicable" : "0"}
                    disabled={!editable || noAmount}
                  />
                )}
              />
              <FieldError message={errors.approvedCompensationAmount?.message} />
            </div>
            <div>
              <label className={fieldLabelClass} htmlFor="resolution-summary">Resolution summary <span className="text-red-500">*</span></label>
              <Textarea id="resolution-summary" rows={4} className={textareaClass} disabled={!editable} placeholder="Agreement reached between both parties. For a rejection, give the grounds (cite the e-POD figures)." {...register("resolutionSummary")} />
              <FieldError message={errors.resolutionSummary?.message} />
            </div>
            <div>
              <label className={fieldLabelClass} htmlFor="resolution-corrective">Corrective action</label>
              <Textarea id="resolution-corrective" rows={2} className={textareaClass} disabled={!editable} placeholder="Internal service improvement actions taken with carrier or escort..." {...register("correctiveAction")} />
              <FieldError message={errors.correctiveAction?.message} />
            </div>
            <div>
              <label className={fieldLabelClass} htmlFor="resolution-internal">Internal note</label>
              <Textarea id="resolution-internal" rows={2} className={textareaClass} disabled={!editable} placeholder="Private internal notes for logistics management..." {...register("internalNote")} />
              <FieldError message={errors.internalNote?.message} />
            </div>
            {claim.resolution ? (
              <p className="text-[11px] text-gray-500">
                Decided {formatInvoiceDateTime(claim.resolution.resolvedAt)}
                {claim.resolution.approvedCompensationAmount !== null ? ` · approved ${formatMoney(claim.resolution.approvedCompensationAmount)}` : ""}
              </p>
            ) : null}
          </form>
          {error ? <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">{getClaimErrorMessage(error, "Unable to save the resolution. Please try again.")}</div> : null}

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#e5e2d9] pt-3">
            {canResolve ? <Button type="button" variant="outline" className={dangerButtonClass} onClick={() => submit("reject")} disabled={pending}>Reject claim</Button> : null}
            {canResolve ? (
              <Button type="button" variant="outline" className={outlineButtonClass} onClick={() => submit("approve")} disabled={pending || resolutionType === "NO_COMPENSATION"} title={resolutionType === "NO_COMPENSATION" ? "Use Reject claim for a claim without compensation" : undefined}>
                Approve only
              </Button>
            ) : null}
            {canCreditNote ? <Button type="button" variant="outline" className={outlineButtonClass} onClick={() => openCreditNoteForm(claim, navigate)} disabled={pending}>Create credit note</Button> : null}
            {canResolve ? (
              <Button type="button" className={primaryButtonClass} onClick={() => void form.trigger().then((valid) => valid && setConfirm("resolve"))} disabled={pending || resolutionType === "NO_COMPENSATION"}>
                {pending ? "Saving..." : "Resolve claim"}
              </Button>
            ) : null}
            {canComplete ? <Button type="button" className={primaryButtonClass} onClick={() => setConfirm("complete")} disabled={pending}>Complete claim</Button> : null}
          </div>
        </aside>
      </div>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && !pending && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resolve claim {claim.claimCode}?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "resolve"
                ? "This approves the claim with the outcome entered and marks the compensation as completed. The customer is notified and the claim is closed."
                : "This confirms the compensation was carried out (for example the credit note was paid) and closes the claim. The customer is notified."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Not yet</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={(event) => { event.preventDefault(); if (confirm === "resolve") submit("resolve"); else void markCompleted() }}>
              {pending ? "Saving..." : "Resolve claim"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={staleOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Please reload the page</AlertDialogTitle>
            <AlertDialogDescription>This claim was just modified. Reload to get the latest version; the values you typed will be replaced.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => { setStaleOpen(false); onReload() }}>Reload</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
