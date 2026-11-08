/**
 * TEMPORARY. Stand-ins for components that other people build (task doc, section 8, "Điểm nối").
 * They have the exact export names and the frozen props, so the detail page can be built and tried before the real ones exist.
 *
 *   PriceListFormDialog, ActivatePriceListDialog, ClonePriceListButton   -> Dương (D-01, D-02)
 *   (DeletePriceListItemDialog is Khuyên's K-02 and is already the real one.)
 *
 * When the branches are merged: delete this file and point the imports in `pages/PriceListDetailPage.tsx`
 * at `components/PriceListFormDialog`, `ActivatePriceListDialog` and `ClonePriceListButton`. Nothing else changes.
 */
import { toast } from "sonner"
import { outlineButtonClass } from "@/features/price-list/components/PriceListPrimitives"
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
