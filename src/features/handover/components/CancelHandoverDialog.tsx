import { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Textarea } from "@/shared/components/ui/textarea"
import { CANCEL_REASON_MIN, LIMITS } from "../constants"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  code: string
  pending: boolean
  /** Message from the BE (`message` / `errors[]`) when the cancel was refused. */
  serverError?: string
  onSubmit: (reason: string) => void
}

/** HO6: the reason is mandatory and needs at least 10 characters. */
export function CancelHandoverDialog({ open, onOpenChange, code, pending, serverError, onSubmit }: Props) {
  const [reason, setReason] = useState("")
  const [touched, setTouched] = useState(false)
  const trimmed = reason.trim()
  const invalid = trimmed.length < CANCEL_REASON_MIN
  const showError = touched && invalid

  const submit = () => {
    setTouched(true)
    if (!invalid) onSubmit(trimmed)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-h-[calc(100svh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto rounded-[2px] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase">Cancel handover {code}</DialogTitle>
          <DialogDescription>This handover point will be cancelled and can be created again. Tell the team why.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <label htmlFor="cancel-reason" className="font-heading text-[0.6875rem] font-semibold tracking-[0.06em] text-gray-600 uppercase">
            Reason <span className="text-red-600">*</span>
          </label>
          <Textarea
            id="cancel-reason"
            value={reason}
            maxLength={LIMITS.note}
            autoFocus
            aria-invalid={showError ? true : undefined}
            onBlur={() => setTouched(true)}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. The receiving driver is delayed, the handover moves to tomorrow."
            className="min-h-28 rounded-[2px] border-slate-300 bg-white text-base shadow-none sm:text-sm"
          />
          <div className="flex justify-between gap-2 text-xs">
            <p role={showError ? "alert" : undefined} className="text-red-600">
              {showError ? `Please enter at least ${CANCEL_REASON_MIN} characters.` : ""}
            </p>
            <span className="text-gray-500">{trimmed.length}/{CANCEL_REASON_MIN} min</span>
          </div>
          {serverError ? <p role="alert" className="text-sm text-red-600">{serverError}</p> : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)} className="min-h-11 rounded-[2px] sm:min-h-9">
            Keep handover
          </Button>
          <Button type="button" variant="destructive" disabled={pending} onClick={submit} className="min-h-11 rounded-[2px] sm:min-h-9">
            {pending ? "Cancelling…" : "Cancel handover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
