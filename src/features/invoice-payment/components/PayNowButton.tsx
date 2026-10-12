import { Button } from '@/shared/components/ui/button'
import { INVOICE_ACTION } from '@/shared/constants/invoice'
import type { Invoice } from '@/shared/types/invoice'
import { useOnlinePayment } from '@/features/invoice-payment/hooks/useOnlinePayment'
import { mapPaymentError } from '@/features/invoice-payment/utils/payment.error'

export function PayNowButton({ invoice }: { invoice: Invoice }) {
  const mutation = useOnlinePayment()
  const canPay = invoice.availableActions.includes(INVOICE_ACTION.PAY_NOW)

  if (!canPay) return null

  const mappedError = mutation.error ? mapPaymentError(mutation.error) : null

  function handlePayNow() {
    mutation.mutate(
      { invoiceId: invoice.invoiceId },
      {
        onSuccess: ({ paymentUrl }) => {
          window.location.assign(paymentUrl)
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
