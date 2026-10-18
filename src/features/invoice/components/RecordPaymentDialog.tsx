import { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Textarea } from "@/shared/components/ui/textarea"
import { INVOICE_ACTION, INVOICE_TYPE, PAYMENT_METHOD, type PaymentMethod } from "@/features/invoice/constants"
import type { RecordPaymentDialogProps } from "@/features/invoice/types"
import { useRecordPayment } from "@/features/invoice/hooks/useRecordPayment"
import { mapPaymentError, formatPaymentAmount, toPaymentTimestamp, validateRecordPayment } from "@/features/invoice/utils"

function localDateTimeValue() {
  const date = new Date()
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function RecordPaymentDialog({ invoice, onRecorded }: RecordPaymentDialogProps) {
  const canRecord = invoice.availableActions.includes(INVOICE_ACTION.RECORD_PAYMENT)
  const isQuotation = invoice.type === INVOICE_TYPE.QUOTATION
  const mutation = useRecordPayment()
  const [open, setOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PAYMENT_METHOD.CASH)
  const [transactionReference, setTransactionReference] = useState('')
  const [paidAt, setPaidAt] = useState(localDateTimeValue)
  const [note, setNote] = useState('')
  const [validationMessage, setValidationMessage] = useState<string | null>(null)

  if (!canRecord || isQuotation) return null

  function resetForm() {
    setPaymentMethod(PAYMENT_METHOD.CASH)
    setTransactionReference('')
    setPaidAt(localDateTimeValue())
    setNote('')
    setValidationMessage(null)
    mutation.reset()
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) resetForm()
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const payload = {
      amount: invoice.summary.grandTotal,
      paymentMethod,
      paidAt: paidAt ? toPaymentTimestamp(paidAt) : undefined,
      transactionReference: transactionReference || undefined,
      note: note || undefined,
    }
    const validation = validateRecordPayment(payload, invoice)
    if (!validation.success) {
      setValidationMessage(validation.error.issues[0]?.message ?? 'Check the payment details.')
      return
    }

    setValidationMessage(null)
    mutation.mutate(
      { invoiceId: invoice.invoiceId, payload: validation.data },
      {
        onSuccess: (response) => {
          onRecorded(response)
          setOpen(false)
          resetForm()
        },
      },
    )
  }

  const mappedError = mutation.error ? mapPaymentError(mutation.error) : null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button">Record payment</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-[2px] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {invoice.type === INVOICE_TYPE.CREDIT_NOTE ? 'Confirm compensation payment' : 'Record payment'}
          </DialogTitle>
          <DialogDescription>
            Confirm the full payment for {invoice.invoiceNumber}. The invoice status will use the server response.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="record-payment-amount">Amount</Label>
            <Input id="record-payment-amount" value={formatPaymentAmount(invoice.summary.grandTotal, invoice.currency)} readOnly />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="record-payment-method">Payment method</Label>
            <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
              <SelectTrigger id="record-payment-method" className="w-full">
                <SelectValue placeholder="Select a payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PAYMENT_METHOD.CASH}>Cash</SelectItem>
                <SelectItem value={PAYMENT_METHOD.BANK_TRANSFER}>Bank transfer</SelectItem>
                <SelectItem value={PAYMENT_METHOD.OTHER}>Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="record-payment-reference">Transaction reference</Label>
            <Input
              id="record-payment-reference"
              value={transactionReference}
              onChange={(event) => setTransactionReference(event.target.value)}
              maxLength={150}
              placeholder="Optional reference"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="record-payment-paid-at">Paid at</Label>
            <Input id="record-payment-paid-at" type="datetime-local" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="record-payment-note">Note</Label>
            <Textarea id="record-payment-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional reconciliation note" />
          </div>
          {validationMessage ? <p className="text-sm text-destructive" role="alert">{validationMessage}</p> : null}
          {mappedError ? (
            <p className="text-sm text-destructive" role="alert">
              {mappedError.message}{mappedError.errorCode ? ` (${mappedError.errorCode})` : ''}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Submitting...' : 'Confirm payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
