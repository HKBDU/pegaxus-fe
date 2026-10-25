import { Lock } from "lucide-react"
import { INVOICE_ITEM_TYPE_LABELS } from "@/features/invoice/constants"
import type { InvoiceItem } from "@/features/invoice/types"
import { formatMoney } from "@/features/invoice/utils"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"

interface GeneratedLinesTableProps {
  items: InvoiceItem[]
  isLoading: boolean
  /** Shown above the table: why there are no inputs and when the lines are rebuilt. */
  hint: string
}

const HEADERS = ["#", "Fee type", "Description", "Qty", "Unit price", "Amount"] as const

/**
 * Lines of a QUOTATION, DEPOSIT or FINAL: built by the server (IV1 while creating, the saved draft while editing), so
 * they are shown read-only. A deposit deduction is a normal negative row.
 */
export function GeneratedLinesTable({ items, isLoading, hint }: GeneratedLinesTableProps) {
  return (
    <section className="border border-[#e5e2d9] bg-white" aria-label="Line items">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e5e2d9] bg-[#f7f6f3] px-4 py-2.5">
        <h3 className="m-0! flex items-center gap-2 font-heading text-[13px]! font-bold! uppercase tracking-[0.04em]! text-gray-900!">
          <Lock className="size-4 text-[#ef8f00]" aria-hidden="true" />
          Line items ({items.length})
        </h3>
        <p className="m-0 text-[11px] text-gray-500">{hint}</p>
      </div>
      <div className="p-3">
        <div className="booking-panel overflow-x-auto">
          <Table className="min-w-[760px]">
            <TableHeader className="bg-[#e9e6de] [&_tr]:border-b-0">
              <TableRow className="border-b-0 hover:bg-transparent">
                {HEADERS.map((header) => (
                  <TableHead key={header} scope="col" className={cn("h-10 whitespace-nowrap px-2 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600", header === "Qty" || header === "Unit price" || header === "Amount" ? "text-right" : "text-left")}>
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  {HEADERS.map((header) => <TableCell key={header} className="px-2 py-2"><Skeleton className="h-3.5 w-full rounded-none bg-slate-100" /></TableCell>)}
                </TableRow>
              ) : items.length ? (
                items.map((item, index) => (
                  <TableRow key={item.invoiceItemId ?? `${item.description}-${index}`} className="border-slate-200 hover:bg-amber-50/60 [&>td]:px-2 [&>td]:py-1.5 [&>td]:text-xs">
                    <TableCell className="text-gray-500">{index + 1}</TableCell>
                    <TableCell className="whitespace-nowrap">{INVOICE_ITEM_TYPE_LABELS[item.itemType]}</TableCell>
                    <TableCell>
                      <p className="m-0 font-medium text-gray-900">{item.description}</p>
                      {item.isDepositDeduction ? <p className="m-0 text-[11px] text-gray-500">Added from a paid deposit</p> : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">{formatMoney(item.price)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right font-medium tabular-nums">{formatMoney(item.total)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={HEADERS.length} className="px-2 py-6 text-center text-xs text-gray-500">No lines yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  )
}
