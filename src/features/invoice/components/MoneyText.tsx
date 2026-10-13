import type { InvoiceCurrency } from "@/features/invoice/constants"
import { formatMoney } from "@/features/invoice/utils"

export function MoneyText({
  amount,
  currency,
  className,
}: {
  amount: number
  currency: InvoiceCurrency
  className?: string
}) {
  return <span className={className}>{formatMoney(amount, currency)}</span>
}
