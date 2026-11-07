import { Eye, Play, Copy } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { DateTimeUtc } from "@/shared/components/DateTimeUtc"
import type { PriceListSummary } from "../list.schemas"
import { PriceListStatusBadge } from "./PriceListStatusBadge"

interface Props {
  items: PriceListSummary[]
  onView: (item: PriceListSummary) => void
  onClone?: (item: PriceListSummary) => void
  onActivate?: (item: PriceListSummary) => void
}

export function PriceListTable({ items, onView, onClone, onActivate }: Props) {
  return (
    <div className="overflow-x-auto rounded-md border bg-white">
      <Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Currency</TableHead><TableHead>VAT</TableHead><TableHead>Deposit</TableHead><TableHead>Items</TableHead><TableHead>Status</TableHead><TableHead>Created (UTC)</TableHead><TableHead>Updated (UTC)</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
        <TableBody>{items.map((item) => <TableRow key={item.priceListId} className="cursor-pointer" onClick={() => onView(item)}>
          <TableCell className="font-medium">{item.name}</TableCell><TableCell>{item.currency}</TableCell><TableCell>{item.taxRate}%</TableCell><TableCell>{item.depositRate}%</TableCell><TableCell>{item.itemCount}</TableCell><TableCell><PriceListStatusBadge isActive={item.isActive} /></TableCell><TableCell><DateTimeUtc value={item.createdAt} compact /></TableCell><TableCell><DateTimeUtc value={item.updatedAt} compact /></TableCell>
          <TableCell><div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
            <Button variant="ghost" size="sm" onClick={() => onView(item)}><Eye className="mr-1.5 size-4" />View</Button>
            {onClone ? <Button variant="ghost" size="sm" onClick={() => onClone(item)}><Copy className="mr-1.5 size-4" />Clone</Button> : null}
            {!item.isActive && onActivate ? <Button variant="ghost" size="sm" disabled={item.itemCount === 0} title={item.itemCount === 0 ? "Add price lines first" : undefined} onClick={() => onActivate(item)}><Play className="mr-1.5 size-4" />Activate</Button> : null}
          </div></TableCell>
        </TableRow>)}</TableBody>
      </Table>
    </div>
  )
}
