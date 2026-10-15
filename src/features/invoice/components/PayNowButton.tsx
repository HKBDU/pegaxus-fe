import { Button } from "@/shared/components/ui/button"
import { INVOICE_ACTION } from "@/features/invoice/constants"
import type { PayNowButtonProps } from "@/features/invoice/types"
import { useOnlinePayment } from "@/features/invoice/hooks/useOnlinePayment"
import { mapPaymentError, submitCheckoutForm } from "@/features/invoice/utils"

export function PayNowButton({ invoice }: PayNowButtonProps) {
  const mutation = useOnlinePayment()
  const canPay = invoice.availableActions.includes(INVOICE_ACTION.PAY_NOW)

  if (!canPay) return null

  const isVnd = invoice.currency === "VND"
  const mappedError = mutation.error ? mapPaymentError(mutation.error) : null

  function handlePayNow() {
    if (!isVnd) return
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
      <Button
        type="button"
        onClick={handlePayNow}
        disabled={mutation.isPending || !isVnd}
        title={!isVnd ? "Online payment via SePay currently supports VND only" : undefined}
      >
        {mutation.isPending ? 'Opening payment gateway...' : 'Pay now'}
      </Button>
      {!isVnd ? (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5" role="note">
          Online payment via SePay currently supports VND only. For {invoice.currency} invoices, please pay via international bank transfer or contact logistics management.
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
