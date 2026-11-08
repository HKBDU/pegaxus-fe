import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { getPriceListErrorCode, getPriceListErrorMessage } from "../errors"
import { useDeletePriceListItem } from "../hooks/useDeletePriceListItem"

export interface DeletePriceListItemDialogProps {
  priceListId: string
  item: { priceListItemId: string; itemCode: string }
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}

export function DeletePriceListItemDialog({ priceListId, item, open, onOpenChange, onDeleted }: DeletePriceListItemDialogProps) {
  const mutation = useDeletePriceListItem()
  const [errorMessage, setErrorMessage] = useState<string>()
  // A reopened dialog starts without the last error. Reset while rendering, not in an effect, so there is no extra render pass.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setErrorMessage(undefined)
  }

  const confirm = () => mutation.mutate({ priceListId, itemId: item.priceListItemId }, {
    onSuccess: () => { toast.success("Price line deleted"); onOpenChange(false); onDeleted() },
    onError: (error) => {
      const code = getPriceListErrorCode(error)
      if (code === "PRICE_LIST_ITEM_NOT_FOUND") { onOpenChange(false); onDeleted(); return }
      if (code === "ACTIVE_PRICELIST_LOCKED") onDeleted()
      setErrorMessage(getPriceListErrorMessage(error))
    },
  })

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent>
    <DialogHeader><DialogTitle>Delete price line “{item.itemCode}”?</DialogTitle><DialogDescription>This cannot be undone. Invoices already created from this line keep their data.</DialogDescription></DialogHeader>
    {errorMessage ? <p className="text-sm text-red-600" role="alert">{errorMessage}</p> : null}
    <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancel</Button><Button variant="destructive" onClick={confirm} disabled={mutation.isPending}>{mutation.isPending ? "Deleting…" : "Delete"}</Button></DialogFooter>
  </DialogContent></Dialog>
}
