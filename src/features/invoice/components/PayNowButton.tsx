import { Button } from "@/shared/components/ui/button"
import { INVOICE_ACTION } from "@/features/invoice/constants"
import type { PayNowButtonProps } from "@/features/invoice/types"
import { useOnlinePayment } from "@/features/invoice/hooks/useOnlinePayment"
import { formatMoney, isPayableAmount, mapPaymentError, submitCheckoutForm } from "@/features/invoice/utils"

export function PayNowButton({ invoice }: PayNowButtonProps) {
  const mutation = useOnlinePayment()
  const canPay = invoice.availableActions.includes(INVOICE_ACTION.PAY_NOW)

  if (!canPay) return null

  const mappedError = mutation.error ? mapPaymentError(mutation.error) : null
  // The amount charged is the invoice total computed by the BE; a total with decimals (e.g. 20% tax on an odd subtotal) cannot go through SePay.
  const amountPayable = isPayableAmount(invoice.summary.grandTotal)

  function handlePayNow() {
    if (!amountPayable) return
    mutation.mutate(
      { invoiceId: invoice.invoiceId },
      {
        onSuccess: ({ paymentUrl, checkoutFields }) => {
          submitCheckoutForm(paymentUrl, checkoutFields)
        },
      },
    )
  }

  return (
    <div className="grid gap-2">
      <Button type="button" onClick={handlePayNow} disabled={mutation.isPending || !amountPayable}>
        {mutation.isPending ? 'Opening payment gateway...' : 'Pay now'}
      </Button>
      {!amountPayable ? (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5" role="note">
          Online payment needs a whole VND amount, but this invoice total is {formatMoney(invoice.summary.grandTotal)} with decimals ({invoice.summary.grandTotal}). Please contact logistics management to correct the invoice.
        </p>
      ) : null}
      {mappedError ? (
        <p className="text-sm text-destructive" role="alert">
          {mappedError.message}{mappedError.errorCode ? ` (${mappedError.errorCode})` : ''}
        </p>
      ) : null}
    </div>
  )
}
