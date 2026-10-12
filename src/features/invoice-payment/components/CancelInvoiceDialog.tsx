import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { INVOICE_ACTION, INVOICE_STATUS, INVOICE_STATUS_LABELS } from '@/shared/constants/invoice'
import type { Invoice, CancelInvoiceResponse } from '@/shared/types/invoice'
import { useCancelInvoice } from '@/features/invoice-payment/hooks/useCancelInvoice'
import { mapPaymentError } from '@/features/invoice-payment/utils/payment.error'
import { validateCancellation } from '@/features/invoice-payment/utils/payment.validation'

type CancelInvoiceDialogProps = {
  invoice: Invoice
  onCancelled: (response: CancelInvoiceResponse) => void
}

const STATUS_WARNINGS = {
  [INVOICE_STATUS.DRAFT]: 'This draft has not been issued and will remain hidden from the customer after cancellation.',
  [INVOICE_STATUS.ISSUED]: 'The customer will see this invoice as cancelled after confirmation.',
  [INVOICE_STATUS.OVERDUE]: 'The customer will see this overdue invoice as cancelled after confirmation.',
} as const

export function CancelInvoiceDialog({ invoice, onCancelled }: CancelInvoiceDialogProps) {
  const canCancel = invoice.availableActions.includes(INVOICE_ACTION.CANCEL)
  const mutation = useCancelInvoice()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [validationMessage, setValidationMessage] = useState<string | null>(null)

  if (!canCancel) return null

  function resetForm() {
    setReason('')
    setValidationMessage(null)
    mutation.reset()
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) resetForm()
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validation = validateCancellation(reason)
    if (!validation.success) {
      setValidationMessage(validation.error.issues[0]?.message ?? 'Enter a valid cancellation reason.')
      return
    }

    setValidationMessage(null)
    mutation.mutate(
      { invoiceId: invoice.invoiceId, payload: validation.data },
      {
        onSuccess: (response) => {
          onCancelled(response)
          setOpen(false)
          resetForm()
        },
      },
    )
  }

  const mappedError = mutation.error ? mapPaymentError(mutation.error) : null
  const warning = STATUS_WARNINGS[invoice.status as keyof typeof STATUS_WARNINGS]

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive">Cancel invoice</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-[2px] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cancel invoice</DialogTitle>
          <DialogDescription>
            Cancel {invoice.invoiceNumber} in status {INVOICE_STATUS_LABELS[invoice.status]}.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          {warning ? <p className="rounded-[2px] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{warning}</p> : null}
          <div className="grid gap-2">
            <Label htmlFor="cancel-invoice-reason">Cancellation reason</Label>
            <Textarea
              id="cancel-invoice-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              minLength={10}
              required
              placeholder="Explain why this invoice is being cancelled"
              className="min-h-28 rounded-[2px]"
            />
            <p className="text-xs text-muted-foreground">At least 10 characters after trimming.</p>
          </div>
          {validationMessage ? <p className="text-sm text-destructive" role="alert">{validationMessage}</p> : null}
          {mappedError ? (
            <p className="text-sm text-destructive" role="alert">
              {mappedError.message}{mappedError.errorCode ? ` (${mappedError.errorCode})` : ''}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>
              Keep invoice
            </Button>
            <Button type="submit" variant="destructive" disabled={mutation.isPending}>
              {mutation.isPending ? 'Cancelling...' : 'Confirm cancellation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
