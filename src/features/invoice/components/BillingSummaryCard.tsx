import { Calculator } from "lucide-react"

import type { InvoiceCurrency, InvoiceSummary } from "@/features/invoice/types"
import { formatMoney } from "@/features/invoice/utils"

export interface BillingSummaryLine {
  key: string
  label: string
  amount: number
}

interface BillingSummaryCardProps {
  lines: BillingSummaryLine[]
  summary: InvoiceSummary
  currency: InvoiceCurrency
}

/**
 * "Billing Summary" panel of the create/edit dialog. `lines` are the fee lines the manager typed; the deposit deduction
 * of a FINAL is its own row. The numbers are a client estimate (contract R8: 20% tax, no discount, deposit deduction
 * after tax); the server recalculates them when the draft is saved.
 */
export function BillingSummaryCard({ lines, summary, currency }: BillingSummaryCardProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-gray-50 p-4" aria-label="Billing summary">
      <h3 className="m-0! flex items-center gap-2 text-sm! font-semibold! tracking-normal! text-gray-900!">
        <Calculator className="size-4 text-gray-500" aria-hidden="true" />
        Billing Summary
      </h3>

      <div className="mt-3 rounded-lg bg-white p-3 text-xs text-gray-700">
        {lines.length ? (
          <ul className="space-y-2">
            {lines.map((line) => (
              <li key={line.key} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 break-words">{line.label}</span>
                <span className="whitespace-nowrap font-medium tabular-nums text-gray-900">{formatMoney(line.amount, currency)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400">No fee lines yet.</p>
        )}

        <dl className="mt-3 space-y-2 border-t border-gray-200 pt-3">
          <SummaryRow label="Subtotal" value={formatMoney(summary.subtotal, currency)} />
          <SummaryRow label={`Tax (${summary.taxRatePercent}%)`} value={formatMoney(summary.tax, currency)} />
          <SummaryRow label="Discount" value={formatMoney(summary.discount, currency)} valueClassName="text-emerald-600" />
          {summary.depositDeduction !== 0 ? <SummaryRow label="Deposit deduction" value={formatMoney(summary.depositDeduction, currency)} valueClassName="text-emerald-600" /> : null}
        </dl>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-orange-50 px-4 py-3 text-orange-600">
        <span className="text-sm font-semibold">Total Amount</span>
        <span className="whitespace-nowrap text-lg font-bold tabular-nums">{formatMoney(summary.grandTotal, currency)}</span>
      </div>
      <p className="mt-2 text-[11px] leading-4 text-gray-500">Estimate only. The server recalculates the amounts when the draft is saved.</p>
    </section>
  )
}

function SummaryRow({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt>{label}</dt>
      <dd className={`whitespace-nowrap font-medium tabular-nums ${valueClassName ?? "text-gray-900"}`}>{value}</dd>
    </div>
  )
}
