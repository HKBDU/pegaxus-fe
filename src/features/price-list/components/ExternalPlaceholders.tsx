/**
 * TEMPORARY. Stand-ins for components that other people build (task doc, section 8, "Điểm nối").
 * They have the exact export names and the frozen props, so the detail page can be built and tried before the real ones exist.
 *
 *   PriceListFormDialog, ActivatePriceListDialog, ClonePriceListButton   -> Dương (D-01, D-02)
 *   PriceListItemsTable, DeletePriceListItemDialog                        -> Khuyên (K-03, K-02)
 *
 * When the branches are merged: delete this file and point the imports in `pages/PriceListDetailPage.tsx`
 * at `components/PriceListFormDialog`, `ActivatePriceListDialog`, `ClonePriceListButton`,
 * `PriceListItemsTable` and `DeletePriceListItemDialog`. Nothing else changes.
 */
import { toast } from "sonner"
import { outlineButtonClass } from "@/features/price-list/components/PriceListPrimitives"
import type { PriceListItem } from "@/features/price-list/types"
import { formatAmount } from "@/features/price-list/utils"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"

interface PlaceholderDialogProps {
  title: string
  owner: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function PlaceholderDialog({ title, owner, open, onOpenChange }: PlaceholderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-[0.04em]">{title}</DialogTitle>
          <DialogDescription>Placeholder: the real dialog is built by {owner}.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" className={outlineButtonClass} onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Dương, D-01. */
export function PriceListFormDialog(props: {
  mode: "create" | "edit"
  open: boolean
  onOpenChange: (open: boolean) => void
  priceList?: { priceListId: string; name: string; currency: string; taxRate: number; depositRate: number; updatedAt: string }
  onSaved: (priceList: { priceListId: string }) => void
}) {
  return <PlaceholderDialog title={props.mode === "edit" ? "Edit price list" : "Create price list"} owner="Dương (D-01)" open={props.open} onOpenChange={props.onOpenChange} />
}

/** Dương, D-02. */
export function ActivatePriceListDialog(props: {
  priceList: { priceListId: string; name: string; isActive: boolean }
  open: boolean
  onOpenChange: (open: boolean) => void
  onActivated: (priceList: { priceListId: string }) => void
}) {
  return <PlaceholderDialog title={`Activate ${props.priceList.name}`} owner="Dương (D-02)" open={props.open} onOpenChange={props.onOpenChange} />
}

/** Dương, D-02. */
export function ClonePriceListButton(_props: {
  priceList: { priceListId: string; name: string }
  onCloned: (newPriceList: { priceListId: string }) => void
  variant?: "default" | "outline"
}) {
  return (
    <Button type="button" variant="outline" className={outlineButtonClass} onClick={() => toast.info("Clone is built by Dương (D-02).")}>
      Clone
    </Button>
  )
}

/** Khuyên, K-02. */
export function DeletePriceListItemDialog(props: {
  priceListId: string
  item: { priceListItemId: string; itemCode: string }
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}) {
  return <PlaceholderDialog title={`Delete ${props.item.itemCode}`} owner="Khuyên (K-02)" open={props.open} onOpenChange={(open) => { props.onOpenChange(open); if (!open) props.onDeleted() }} />
}

/** Khuyên, K-03. A bare table, just enough to open the line form from the detail page. */
export function PriceListItemsTable(props: {
  items: PriceListItem[]
  currency: string
  isActive: boolean
  onEdit: (item: PriceListItem) => void
  onDelete: (item: PriceListItem) => void
  onAdd?: () => void
}) {
  if (props.items.length === 0) {
    return (
      <div className="border border-[#e5e2d9] bg-white p-6 text-center text-xs text-gray-600">
        No price lines yet. Add the first line.
        {props.onAdd && !props.isActive ? (
          <div className="mt-3"><Button type="button" variant="outline" className={outlineButtonClass} onClick={props.onAdd}>Add price line</Button></div>
        ) : null}
      </div>
    )
  }
  return (
    <div className="overflow-x-auto border border-[#e5e2d9] bg-white">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead className="bg-gray-50 text-[11px] uppercase text-gray-600">
          <tr>
            <th className="px-2.5 py-2">Code</th><th className="px-2.5 py-2">Name</th><th className="px-2.5 py-2">Unit</th>
            <th className="px-2.5 py-2 text-right">Price ({props.currency})</th><th className="px-2.5 py-2">Tier</th><th className="px-2.5 py-2">Order</th><th className="px-2.5 py-2" />
          </tr>
        </thead>
        <tbody>
          {props.items.map((item) => (
            <tr key={item.priceListItemId} className="border-t border-gray-100">
              <td className="px-2.5 py-2 font-mono">{item.itemCode}</td>
              <td className="px-2.5 py-2">{item.itemName}</td>
              <td className="px-2.5 py-2">{item.unit}</td>
              <td className="px-2.5 py-2 text-right">{formatAmount(item.unitPrice)}</td>
              <td className="px-2.5 py-2">{item.vehicleTier ?? "All tiers"}</td>
              <td className="px-2.5 py-2">{item.sortOrder}</td>
              <td className="space-x-2 px-2.5 py-2 text-right">
                <button type="button" className="font-semibold text-primary underline" onClick={() => props.onEdit(item)}>Edit</button>
                {props.isActive ? null : <button type="button" className="font-semibold text-red-700 underline" onClick={() => props.onDelete(item)}>Delete</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
