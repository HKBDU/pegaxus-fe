import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { getClaimErrorCode, getClaimErrorMessage } from "@/features/claim/errors"
import { useCancelClaim } from "@/features/claim/hooks"
import { cancelClaimSchema, toCancelPayload, type CancelClaimValues } from "@/features/claim/schemas"
import type { Claim } from "@/features/claim/types"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Textarea } from "@/shared/components/ui/textarea"
import { dangerButtonClass, FieldError, fieldLabelClass, outlineButtonClass, textareaClass } from "@/features/claim/components/ClaimPrimitives"

interface CancelClaimDialogProps {
  claim: Claim
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The BE says the claim changed (CLAIM_MODIFIED / INVALID_CLAIM_STATUS): the page reloads it. */
  onStale: () => void
  onCancelled?: (claim: Claim) => void
}

/** CL6: a pending claim is withdrawn by its customer or by the manager; the reason is mandatory. */
export function CancelClaimDialog({ claim, open, onOpenChange, onStale, onCancelled }: CancelClaimDialogProps) {
  const mutation = useCancelClaim(claim.claimId)
  const [error, setError] = useState<unknown>()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CancelClaimValues>({
    resolver: zodResolver(cancelClaimSchema),
    defaultValues: { cancellationReason: "" },
  })

  function close(next: boolean) {
    if (mutation.isPending) return
    if (!next) {
      reset()
      setError(undefined)
    }
    onOpenChange(next)
  }

  const submit = handleSubmit((values) => {
    setError(undefined)
    mutation.mutate(toCancelPayload(values, claim.updatedAt), {
      onSuccess: (saved) => {
        toast.success(`Claim ${saved.claimCode} cancelled`)
        reset()
        onOpenChange(false)
        onCancelled?.(saved)
      },
      onError: (failure) => {
        const code = getClaimErrorCode(failure)
        if (code === "CLAIM_MODIFIED" || code === "INVALID_CLAIM_STATUS") {
          toast.error(getClaimErrorMessage(failure))
          onOpenChange(false)
          return onStale()
        }
        setError(failure)
      },
    })
  })

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="rounded-none sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-[0.04em]">Cancel claim {claim.claimCode}</DialogTitle>
          <DialogDescription>This closes the claim. It cannot be reopened; a new claim has to be submitted if the 24-hour window is still open.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-3">
          <div>
            <label htmlFor="claim-cancel-reason" className={fieldLabelClass}>Reason <span className="text-red-500">*</span></label>
            <Textarea id="claim-cancel-reason" rows={4} placeholder="Explain why the claim is withdrawn (at least 10 characters)" className={textareaClass} disabled={mutation.isPending} {...register("cancellationReason")} />
            <FieldError message={errors.cancellationReason?.message} />
          </div>
          {error ? <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">{getClaimErrorMessage(error)}</div> : null}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" className={outlineButtonClass} disabled={mutation.isPending} onClick={() => close(false)}>Keep claim</Button>
            <Button type="submit" variant="outline" className={dangerButtonClass} disabled={mutation.isPending}>{mutation.isPending ? "Cancelling..." : "Cancel claim"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
