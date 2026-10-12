import { CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import type { InvoiceCurrency } from '@/shared/constants/invoice'
import type { InvoiceSummary } from '@/shared/types/invoice'
import { MoneyText } from './MoneyText'

export function InvoiceSummaryCard({
  summary,
  currency,
  estimate = false,
}: {
  summary: InvoiceSummary
  currency: InvoiceCurrency
  estimate?: boolean
}) {
  const rows = [
    ['Subtotal', summary.subtotal],
    ['Discount', summary.discount],
    [`Tax (${summary.taxRatePercent}%)`, summary.tax],
    ['Deposit deduction', summary.depositDeduction],
  ] as const

  return (
    <div>
      <CardHeader>
        <CardTitle>Summary{estimate ? ' (estimate)' : ''}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map(([label, amount]) => (
          <div key={label} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <MoneyText amount={amount} currency={currency} />
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 border-t pt-3 font-semibold">
          <span>Grand total</span>
          <MoneyText amount={summary.grandTotal} currency={currency} />
        </div>
      </CardContent>
    </div>
  )
}
