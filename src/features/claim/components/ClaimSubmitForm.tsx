import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { Controller, useForm, type Path } from "react-hook-form"
import { Link } from "react-router-dom"
import { CLAIM_TYPES, CLAIM_TYPE_LABELS, CLAIM_LIMITS } from "@/features/claim/constants"
import { ClaimApiError, getClaimErrorMessage } from "@/features/claim/errors"
import { emptySubmitClaimValues, submitClaimSchema, toSubmitPayload, type SubmitClaimValues } from "@/features/claim/schemas"
import type { SubmitClaimPayload } from "@/features/claim/types"
import { cn } from "@/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { MoneyInput } from "@/shared/components/ui/money-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Textarea } from "@/shared/components/ui/textarea"
import { controlClass, FieldError, fieldLabelClass, panelClass, primaryButtonClass, SectionTitle, textareaClass } from "@/features/claim/components/ClaimPrimitives"

interface ClaimSubmitFormProps {
  /** Closed claim window or no signed delivery record: the form stays visible but cannot be sent. */
  disabled: boolean
  submitting: boolean
  error: unknown
  cancelHref: string
  onSubmit: (payload: SubmitClaimPayload) => void
}

/** CL2 form of screen §9. The currency is fixed to VND and there is no file upload (the DB keeps only `evidenceNote`). */
export function ClaimSubmitForm({ disabled, submitting, error, cancelHref, onSubmit }: ClaimSubmitFormProps) {
  const form = useForm<SubmitClaimValues>({
    resolver: zodResolver(submitClaimSchema),
    defaultValues: emptySubmitClaimValues,
    mode: "onTouched",
  })
  const { control, register, handleSubmit, setError, watch, formState: { errors } } = form
  const title = watch("title") ?? ""

  // Field errors of the BE (400 VALIDATION_ERROR) land under the matching input; anything else is the banner below.
  useEffect(() => {
    if (!(error instanceof ClaimApiError)) return
    error.errors?.forEach(({ field, message }) => {
      const name = field.replace(/^\w/, (char) => char.toLowerCase()) as Path<SubmitClaimValues>
      if (name in emptySubmitClaimValues) setError(name, { type: "server", message })
    })
  }, [error, setError])

  return (
    <form
      noValidate
      aria-label="Submit handover claim"
      onSubmit={handleSubmit((values) => onSubmit(toSubmitPayload(values)))}
      className={cn(panelClass, "p-5 sm:p-6")}
    >
      <div className="space-y-5">
        <div>
          <SectionTitle>Claim incident details</SectionTitle>
          <p className="mt-1 text-right font-heading text-[10px] font-bold uppercase tracking-[0.06em] text-[#a85f00]">* Indicates mandatory input</p>
        </div>

        <div>
          <label className={fieldLabelClass} htmlFor="claim-type">Claim type <span className="text-red-500">*</span></label>
          <Controller
            control={control}
            name="claimType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={disabled || submitting}>
                <SelectTrigger id="claim-type" className={controlClass} aria-invalid={Boolean(errors.claimType)}>
                  <SelectValue placeholder="Select claim category..." />
                </SelectTrigger>
                <SelectContent>
                  {CLAIM_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{CLAIM_TYPE_LABELS[type]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.claimType?.message} />
        </div>

        <div>
          <div className="flex items-end justify-between">
            <label className={fieldLabelClass} htmlFor="claim-title">Claim title <span className="text-red-500">*</span></label>
            <span className="mb-1 text-[11px] tabular-nums text-gray-500">{title.length} / {CLAIM_LIMITS.titleMax}</span>
          </div>
          <Input
            id="claim-title"
            maxLength={CLAIM_LIMITS.titleMax}
            placeholder="e.g., Minor abrasion on left hind leg observed upon arrival at stable..."
            className={controlClass}
            disabled={disabled || submitting}
            aria-invalid={Boolean(errors.title)}
            {...register("title")}
          />
          <FieldError message={errors.title?.message} />
        </div>

        <div>
          <label className={fieldLabelClass} htmlFor="claim-description">Detailed description <span className="text-red-500">*</span></label>
          <Textarea
            id="claim-description"
            rows={5}
            placeholder="Describe the specific damage, discrepancies, or issues observed compared to the handover agreement..."
            className={textareaClass}
            disabled={disabled || submitting}
            aria-invalid={Boolean(errors.description)}
            {...register("description")}
          />
          <FieldError message={errors.description?.message} />
        </div>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
          <div>
            <label className={fieldLabelClass} htmlFor="claim-amount">Proposed compensation amount</label>
            <Controller
              control={control}
              name="requestedCompensationAmount"
              render={({ field }) => (
                <MoneyInput
                  id="claim-amount"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Enter proposed amount (leave empty if pending negotiation)"
                  className={controlClass}
                  disabled={disabled || submitting}
                  aria-invalid={Boolean(errors.requestedCompensationAmount)}
                />
              )}
            />
            <FieldError message={errors.requestedCompensationAmount?.message} />
          </div>
          <div>
            <p className={fieldLabelClass}>Currency</p>
            <div className={cn(controlClass, "flex items-center justify-between bg-[#f1efe9] font-semibold text-gray-800")}>
              VND <span className="font-heading text-[10px] font-medium uppercase tracking-[0.06em] text-gray-500">Locked</span>
            </div>
          </div>
        </div>

        <div>
          <label className={fieldLabelClass} htmlFor="claim-customer-note">Customer note &amp; resolution request</label>
          <Textarea
            id="claim-customer-note"
            rows={3}
            placeholder="Specify your expectations, preferred solution, or requested response timeline..."
            className={textareaClass}
            disabled={disabled || submitting}
            {...register("customerNote")}
          />
          <FieldError message={errors.customerNote?.message} />
        </div>

        <div>
          <label className={fieldLabelClass} htmlFor="claim-evidence-note">Evidence &amp; documentation note</label>
          <Textarea
            id="claim-evidence-note"
            rows={3}
            placeholder="List attached veterinary inspection reports, on-site incident photos, or external document links..."
            className={textareaClass}
            disabled={disabled || submitting}
            {...register("evidenceNote")}
          />
          <FieldError message={errors.evidenceNote?.message} />
          <p className="mt-1 text-[11px] leading-4 text-gray-500">
            Files cannot be uploaded here. Describe your evidence or paste a link; the team will exchange documents with you outside the system.
          </p>
        </div>

        {error ? (
          <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
            {getClaimErrorMessage(error, "Unable to submit the claim. Please try again.")}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button asChild type="button" variant="ghost" className="h-9 rounded-none px-5 font-heading text-xs font-semibold uppercase tracking-[0.05em] text-gray-900">
            <Link to={cancelHref}>Cancel</Link>
          </Button>
          <Button type="submit" className={primaryButtonClass} disabled={disabled || submitting}>
            {submitting ? "Submitting..." : "Submit claim"}
          </Button>
        </div>
      </div>
    </form>
  )
}
