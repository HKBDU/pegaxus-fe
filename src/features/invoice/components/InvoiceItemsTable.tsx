import { EmptyState } from "@/shared/components/common/EmptyState"
import { INVOICE_ITEM_TYPE_LABELS, type InvoiceCurrency } from "@/features/invoice/constants"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import type { InvoiceItem } from "@/features/invoice/types"
import { MoneyText } from "@/features/invoice/components/MoneyText"

export function InvoiceItemsTable({
  items,
  currency,
  editable = false,
}: {
  items: InvoiceItem[]
  currency: InvoiceCurrency
  editable?: boolean
}) {
  if (!items.length) return <EmptyState message="No invoice items" />

  return (
    <div data-editable={editable} className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Unit price</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.invoiceItemId ?? `${item.description}-${item.total}`}>
              <TableCell>{INVOICE_ITEM_TYPE_LABELS[item.itemType]}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <span>{item.description}</span>
                  {item.isDepositDeduction ? (
                    <span className="text-xs text-muted-foreground">Deposit deduction (read-only)</span>
                  ) : null}
                  {item.horse ? <span className="text-xs text-muted-foreground">Horse: {item.horse.horseName}</span> : null}
                  {item.itemDate ? <span className="text-xs text-muted-foreground">Date: {item.itemDate}</span> : null}
                  {item.note ? <span className="whitespace-pre-wrap text-xs text-muted-foreground">{item.note}</span> : null}
                </div>
              </TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
              <TableCell className="text-right">
                <MoneyText amount={item.price} currency={currency} />
              </TableCell>
              <TableCell className="text-right font-medium">
                <MoneyText amount={item.total} currency={currency} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
