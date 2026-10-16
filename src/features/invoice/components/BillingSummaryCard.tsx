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
 * "Billing summary" panel of the create/edit dialog. `lines` are the fee lines the manager typed; the deposit deduction
 * of a FINAL is its own row. The numbers are a client estimate (contract R8: 20% tax, deposit deduction after tax); the
 * server recalculates them when the draft is saved.
 */
export function BillingSummaryCard({ lines, summary, currency }: BillingSummaryCardProps) {
  return (
    <section className="flex h-full flex-col border border-[#e5e2d9] bg-white" aria-label="Billing summary">
      <h3 className="m-0! flex items-center gap-2 border-b border-[#e5e2d9] bg-[#f7f6f3] px-4 py-2.5 font-heading text-[13px]! font-bold! uppercase tracking-[0.04em]! text-gray-900!">
        <Calculator className="size-4 text-[#ef8f00]" aria-hidden="true" />
        Billing summary
      </h3>

      <div className="flex min-h-0 flex-1 flex-col p-4 text-xs text-gray-700">
        <div className="h-28 shrink-0 overflow-y-auto">
          {lines.length ? (
            <ul className="space-y-1.5">
              {lines.map((line) => (
                <li key={line.key} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate" title={line.label}>{line.label}</span>
                  <span className="whitespace-nowrap font-medium tabular-nums text-gray-900">{formatMoney(line.amount, currency)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">No fee lines yet.</p>
          )}
        </div>

        <dl className="mt-3 space-y-1.5 border-t border-[#e5e2d9] pt-3">
          <SummaryRow label="Subtotal" value={formatMoney(summary.subtotal, currency)} />
          <SummaryRow label={`Tax (${summary.taxRatePercent}%)`} value={formatMoney(summary.tax, currency)} />
          {summary.depositDeduction !== 0 ? <SummaryRow label="Deposit deduction" value={formatMoney(summary.depositDeduction, currency)} /> : null}
        </dl>

        <div className="mt-3 flex items-center justify-between gap-3 border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-900">
          <span className="font-heading text-xs font-semibold uppercase tracking-[0.05em]">Total amount</span>
          <span className="whitespace-nowrap text-base font-bold tabular-nums">{formatMoney(summary.grandTotal, currency)}</span>
        </div>
        <p className="mt-2 text-[11px] leading-4 text-gray-500">Estimate. The server recalculates the amounts when the draft is saved.</p>
      </div>
    </section>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt>{label}</dt>
      <dd className="whitespace-nowrap font-medium tabular-nums text-gray-900">{value}</dd>
    </div>
  )
}
