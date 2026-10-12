import type { InvoiceCurrency } from '@/shared/constants/invoice'

export function MoneyText({
  amount,
  currency,
  className,
}: {
  amount: number
  currency: InvoiceCurrency
  className?: string
}) {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)

  return <span className={className}>{formatted}</span>
}
