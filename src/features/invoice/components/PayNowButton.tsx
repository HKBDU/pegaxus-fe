import { Button } from "@/shared/components/ui/button"
import { INVOICE_ACTION } from "@/features/invoice/constants"
import type { PayNowButtonProps } from "@/features/invoice/types"
import { useOnlinePayment } from "@/features/invoice/hooks/useOnlinePayment"
import { mapPaymentError, submitCheckoutForm } from "@/features/invoice/utils"

export function PayNowButton({ invoice }: PayNowButtonProps) {
  const mutation = useOnlinePayment()
  const canPay = invoice.availableActions.includes(INVOICE_ACTION.PAY_NOW)

  if (!canPay) return null

  const mappedError = mutation.error ? mapPaymentError(mutation.error) : null

  function handlePayNow() {
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
      <Button type="button" onClick={handlePayNow} disabled={mutation.isPending}>
        {mutation.isPending ? 'Opening payment gateway...' : 'Pay now'}
      </Button>
      {mappedError ? (
        <p className="text-sm text-destructive" role="alert">
          {mappedError.message}{mappedError.errorCode ? ` (${mappedError.errorCode})` : ''}
        </p>
      ) : null}
    </div>
  )
}
