import { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { TimePicker } from "@/shared/components/ui/time-picker"
import { INVOICE_ACTION, INVOICE_TYPE, PAYMENT_METHOD } from "@/features/invoice/constants"
import type { RecordPaymentDialogProps } from "@/features/invoice/types"
import { useRecordPayment } from "@/features/invoice/hooks/useRecordPayment"
import { mapPaymentError, formatPaymentAmount, toPaymentTimestamp, validateRecordPayment } from "@/features/invoice/utils"

/** Local "yyyy-MM-dd" and "HH:mm" of now, the values of the date and time pickers. */
function localDateAndTime() {
  const date = new Date()
  const offset = date.getTimezoneOffset() * 60_000
  const [day, time] = new Date(date.getTime() - offset).toISOString().slice(0, 16).split("T")
  return { day, time }
}

export function RecordPaymentDialog({ invoice, onRecorded }: RecordPaymentDialogProps) {
  const canRecord = invoice.availableActions.includes(INVOICE_ACTION.RECORD_PAYMENT)
  const isQuotation = invoice.type === INVOICE_TYPE.QUOTATION
  const mutation = useRecordPayment()
  const [open, setOpen] = useState(false)
  const [transactionReference, setTransactionReference] = useState('')
  const [paidDay, setPaidDay] = useState(() => localDateAndTime().day)
  const [paidTime, setPaidTime] = useState(() => localDateAndTime().time)
  const [note, setNote] = useState('')
  const [validationMessage, setValidationMessage] = useState<string | null>(null)

  if (!canRecord || isQuotation) return null

  function resetForm() {
    setTransactionReference('')
    setPaidDay(localDateAndTime().day)
    setPaidTime(localDateAndTime().time)
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
      // The Logistics Manager only records cash received in person; other methods come in through online payment.
      paymentMethod: PAYMENT_METHOD.CASH,
      paidAt: paidDay ? toPaymentTimestamp(`${paidDay}T${paidTime || '00:00'}`) : undefined,
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
            <Input id="record-payment-method" value="Cash" readOnly />
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
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,9rem)] gap-2">
              <DatePicker
                id="record-payment-paid-at"
                value={paidDay}
                onChange={setPaidDay}
                maxDate={localDateAndTime().day}
                displayFormat="dd/MM/yyyy"
                placeholder="Pick a date"
                className="h-9 w-full justify-between rounded-[2px] text-left font-normal"
              />
              <TimePicker aria-label="Paid at time" value={paidTime} onChange={setPaidTime} />
            </div>
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
