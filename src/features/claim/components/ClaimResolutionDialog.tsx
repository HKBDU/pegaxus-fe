import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { invoiceCreate } from "@/app/route-config"
import { CancelClaimDialog } from "@/features/claim/components/CancelClaimDialog"
import { ClaimBillingPanel } from "@/features/claim/components/ClaimBillingPanel"
import {
  ClaimStatusBadge,
  ClaimTypeBadge,
  controlClass,
  dangerButtonClass,
  Field,
  FieldError,
  fieldLabelClass,
  outlineButtonClass,
  primaryButtonClass,
  SectionTitle,
  textareaClass,
} from "@/features/claim/components/ClaimPrimitives"
import { AMOUNT_FORBIDDEN_RESOLUTIONS, RESOLUTION_TYPES, RESOLUTION_TYPE_LABELS } from "@/features/claim/constants"
import { ClaimApiError, getClaimErrorCode, getClaimErrorMessage } from "@/features/claim/errors"
import { useClaim, useCompleteClaim, useResolveClaim } from "@/features/claim/hooks"
import { emptyResolveClaimValues, resolveClaimSchema, toResolvePayload, type ResolveClaimValues } from "@/features/claim/schemas"
import type { Claim } from "@/features/claim/types"
import type { InvoicePrefill } from "@/features/invoice/types"
import { formatInvoiceDateTime, formatMoney } from "@/features/invoice/utils"
import { cn } from "@/lib/utils"
import { ErrorState, LoadingState } from "@/shared/components/common"
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
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/components/ui/dialog"
import { MoneyInput } from "@/shared/components/ui/money-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Textarea } from "@/shared/components/ui/textarea"

const STALE_CODES = ["CLAIM_MODIFIED", "INVALID_CLAIM_STATUS", "CLAIM_ALREADY_RESOLVED"]
const readOnlyBox = "border border-[#e5e2d9] bg-[#f7f6f3] px-3 py-2"

type Intent = "approve" | "reject" | "resolve"

export function ClaimResolutionDialog({ claimId, onClose }: { claimId: string; onClose: () => void }) {
  const query = useClaim(claimId)
  const claim = query.data
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[92dvh] max-h-[860px] flex-col gap-0 overflow-hidden rounded-none border-0 bg-white p-0 sm:max-w-[1040px]">
        <header className="flex shrink-0 items-center gap-3 border-b border-gray-900 px-6 py-3.5 pr-14">
          <span aria-hidden="true" className="h-5 w-1.5 bg-[#ef8f00]" />
          <DialogTitle className="m-0! font-heading text-lg! font-bold! uppercase tracking-[0.02em]! text-gray-900!">Claim detail &amp; resolution</DialogTitle>
          <DialogDescription className="sr-only">Review the claim, compare it with the delivery record and decide the outcome.</DialogDescription>
          {claim ? <ClaimStatusBadge status={claim.status} /> : null}
        </header>
        {query.isLoading ? <div className="flex flex-1 items-center justify-center"><LoadingState /></div> : null}
        {query.isError ? (
          <div className="p-6"><ErrorState message={getClaimErrorMessage(query.error, "Unable to load this claim.")} onRetry={() => void query.refetch()} /></div>
        ) : null}
        {claim ? <ClaimResolutionBody key={`${claim.claimId}-${claim.updatedAt}`} claim={claim} onClose={onClose} onReload={() => void query.refetch()} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function ClaimResolutionBody({ claim, onClose, onReload }: { claim: Claim; onClose: () => void; onReload: () => void }) {
  const navigate = useNavigate()
  const resolve = useResolveClaim(claim.claimId)
  const complete = useCompleteClaim(claim.claimId)
  const [error, setError] = useState<unknown>()
  const [staleOpen, setStaleOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [confirm, setConfirm] = useState<"resolve" | "complete" | null>(null)
  const [busy, setBusy] = useState(false)

  const canResolve = claim.availableActions.includes("RESOLVE")
  const canComplete = claim.availableActions.includes("COMPLETE")
  const canCancel = claim.availableActions.includes("CANCEL")
  const billing = claim.billing

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
          } catch (failure) {
            toast.warning(`Claim ${saved.claimCode} was approved, but it could not be marked as resolved yet.`)
            return fail(failure)
          }
        } else {
          toast.success(intent === "reject" ? `Claim ${saved.claimCode} rejected` : `Claim ${saved.claimCode} approved`)
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
    } catch (failure) {
      fail(failure)
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  function createCreditNote() {
    const suggested = billing?.creditNote.suggestedItem
    if (!suggested) return
    const prefill: InvoicePrefill = { type: "CREDIT_NOTE", items: [{ itemType: suggested.itemType, description: suggested.description, quantity: suggested.quantity, price: suggested.price }] }
    navigate(invoiceCreate(claim.booking.bookingId), { state: { prefill } })
  }

  const pending = busy || resolve.isPending || complete.isPending
  const handover = claim.handover

  return (
    <>
      <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_380px] lg:overflow-hidden">
        <div className="min-h-0 space-y-5 p-6 lg:overflow-y-auto">
          <section aria-label="Claim info" className="space-y-3">
            <SectionTitle>Claim info</SectionTitle>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Field label="Claim code" className={readOnlyBox}><span className="font-semibold">{claim.claimCode}</span></Field>
              <Field label="Customer name" className={readOnlyBox}><span className="font-semibold">{claim.customer.name}</span></Field>
              <Field label="Booking" className={readOnlyBox}>{claim.booking.bookingCode}</Field>
              <Field label="Claim type" className={readOnlyBox}><ClaimTypeBadge type={claim.claimType} /></Field>
              <Field label="Title" className={cn(readOnlyBox, "sm:col-span-2")}><span className="font-semibold">{claim.title}</span></Field>
              <Field label="Description" className={readOnlyBox}>{claim.description}</Field>
              <div className="border border-[#ef8f00] bg-[#f7f6f3] px-3 py-2">
                <dt className="font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-500">Requested compensation</dt>
                <dd className="mt-1 font-heading text-2xl font-bold leading-7 text-gray-900">
                  {claim.requestedCompensationAmount == null ? "—" : new Intl.NumberFormat("en-US").format(claim.requestedCompensationAmount)}
                </dd>
                <dd className="font-heading text-[10px] font-bold uppercase tracking-[0.06em] text-[#a85f00]">VND</dd>
              </div>
              <Field label="Customer note" className={readOnlyBox}>{claim.customerNote ? `"${claim.customerNote}"` : ""}</Field>
              <Field label="Evidence note" className={readOnlyBox}>{claim.evidenceNote ? `"${claim.evidenceNote}"` : ""}</Field>
              <Field label="Submitted" className={readOnlyBox}>{formatInvoiceDateTime(claim.submittedAt)}</Field>
              <Field label="Review started" className={readOnlyBox}>{formatInvoiceDateTime(claim.reviewedAt)}</Field>
              {claim.status === "CANCELLED" ? <Field label="Cancellation reason" className={cn(readOnlyBox, "sm:col-span-2")}>{claim.cancellationReason}</Field> : null}
            </dl>
          </section>

          <section aria-label="Linked handover record" className="space-y-3">
            <SectionTitle tone="dark">Linked audit / handover record</SectionTitle>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Field label="Handover code" className={readOnlyBox}>{handover.handoverCode} · {formatInvoiceDateTime(handover.completedAt)}</Field>
              <Field label="Transport" className={readOnlyBox}>{claim.transport.transportCode}</Field>
              <Field label="Horse condition note (delivery)" className={readOnlyBox}>{handover.horseConditionNote}</Field>
              <Field label="Discrepancy note" className={readOnlyBox}>{handover.discrepancyNote}</Field>
              {claim.pickupHandover ? (
                <Field label="Horse condition note (pickup)" className={cn(readOnlyBox, "sm:col-span-2")}>{claim.pickupHandover.horseConditionNote}</Field>
              ) : null}
              <div className={cn(readOnlyBox, "flex items-center justify-between sm:col-span-2")}>
                <span className="font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-500">e-POD signature</span>
                <span className="font-heading text-[11px] font-bold uppercase tracking-[0.05em] text-gray-900">
                  {handover.senderSignatureUrl && handover.receiverSignatureUrl ? "Signed digitally" : "Signature incomplete"}
                </span>
              </div>
              {claim.healthLogSummary ? (
                <Field label="Health logs" className={readOnlyBox}>
                  {claim.healthLogSummary.totalCount} entries, {claim.healthLogSummary.abnormalCount} abnormal · last {formatInvoiceDateTime(claim.healthLogSummary.lastCheckedAt)}
                </Field>
              ) : null}
              <Field label="Incidents on this transport" className={readOnlyBox}>
                {claim.incidents?.length ? (
                  <ul className="space-y-0.5">
                    {claim.incidents.map((incident) => (
                      <li key={incident.incidentReportId} className="text-xs">{incident.incidentCode} · {incident.category} · {incident.severity} · {incident.status}</li>
                    ))}
                  </ul>
                ) : "None"}
              </Field>
            </dl>
          </section>

          {billing ? <ClaimBillingPanel billing={billing} /> : null}
        </div>

        <aside aria-label="Claim resolution" className="space-y-3 border-t border-[#e5e2d9] bg-[#f7f6f3] p-6 lg:overflow-y-auto lg:border-t-0 lg:border-l">
          <SectionTitle>Claim resolution</SectionTitle>
          {!canResolve && !claim.resolution ? <p className="text-xs text-gray-500">No resolution has been recorded for this claim.</p> : null}
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
                    disabled={!canResolve || pending}
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
              <label className={fieldLabelClass} htmlFor="resolution-amount">Approved compensation amount (VND)</label>
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
                    disabled={!canResolve || pending || noAmount}
                  />
                )}
              />
              <FieldError message={errors.approvedCompensationAmount?.message} />
            </div>
            <div>
              <label className={fieldLabelClass} htmlFor="resolution-summary">Resolution summary <span className="text-red-500">*</span></label>
              <Textarea id="resolution-summary" rows={4} className={textareaClass} disabled={!canResolve || pending} placeholder="Agreement reached between both parties. For a rejection, give the grounds (cite the e-POD figures)." {...register("resolutionSummary")} />
              <FieldError message={errors.resolutionSummary?.message} />
            </div>
            <div>
              <label className={fieldLabelClass} htmlFor="resolution-corrective">Corrective action</label>
              <Textarea id="resolution-corrective" rows={3} className={textareaClass} disabled={!canResolve || pending} placeholder="Internal service improvement actions taken with carrier or escort..." {...register("correctiveAction")} />
              <FieldError message={errors.correctiveAction?.message} />
            </div>
            <div>
              <label className={fieldLabelClass} htmlFor="resolution-internal">Internal note</label>
              <Textarea id="resolution-internal" rows={3} className={textareaClass} disabled={!canResolve || pending} placeholder="Private internal notes for logistics management..." {...register("internalNote")} />
              <FieldError message={errors.internalNote?.message} />
            </div>
            {claim.resolution ? <p className="text-[11px] text-gray-500">Decided {formatInvoiceDateTime(claim.resolution.resolvedAt)}{claim.resolution.approvedCompensationAmount !== null ? ` · approved ${formatMoney(claim.resolution.approvedCompensationAmount)}` : ""}</p> : null}
          </form>
          {error ? <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">{getClaimErrorMessage(error, "Unable to save the resolution. Please try again.")}</div> : null}
        </aside>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-gray-900 bg-white px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className={outlineButtonClass} onClick={onClose} disabled={pending}>Close</Button>
          {canCancel ? <Button type="button" variant="outline" className={dangerButtonClass} onClick={() => setCancelOpen(true)} disabled={pending}>Cancel claim</Button> : null}
          {canResolve ? <Button type="button" variant="outline" className={dangerButtonClass} onClick={() => submit("reject")} disabled={pending}>Reject claim</Button> : null}
          {canResolve ? <Button type="button" variant="outline" className={outlineButtonClass} onClick={() => submit("approve")} disabled={pending || resolutionType === "NO_COMPENSATION"} title={resolutionType === "NO_COMPENSATION" ? "Use Reject claim for a claim without compensation" : undefined}>Approve only</Button> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {billing && (claim.status === "PENDING" || claim.status === "APPROVED") ? (
            <Button
              type="button"
              variant="outline"
              className={outlineButtonClass}
              disabled={pending || !claim.availableActions.includes("CREATE_CREDIT_NOTE")}
              onClick={createCreditNote}
              title={billing.creditNote.eligible ? undefined : billing.creditNote.blockedReason ?? undefined}
            >
              Create credit note
            </Button>
          ) : null}
          {canResolve ? <Button type="button" className={primaryButtonClass} onClick={() => void form.trigger().then((valid) => valid && setConfirm("resolve"))} disabled={pending || resolutionType === "NO_COMPENSATION"}>{pending ? "Saving..." : "Resolve claim"}</Button> : null}
          {canComplete ? <Button type="button" className={primaryButtonClass} onClick={() => setConfirm("complete")} disabled={pending}>Resolve claim</Button> : null}
        </div>
      </footer>

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

      <CancelClaimDialog claim={claim} open={cancelOpen} onOpenChange={setCancelOpen} onStale={() => setStaleOpen(true)} />

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
