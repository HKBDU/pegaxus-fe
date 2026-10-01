import { HorseForm } from "@/features/horse/pages/AddHorsePage"
import type { Horse } from "@/features/horse/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"

interface AddHorseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (horse: Horse) => void
}

/**
 * Creates a horse without leaving the booking form, so nothing the customer already entered is lost.
 * Render it outside the booking <form>: the horse form has its own submit.
 */
export function AddHorseDialog({ open, onOpenChange, onCreated }: AddHorseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] gap-2 overflow-y-auto rounded-[2px] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-bold uppercase text-primary">Add new racehorse</DialogTitle>
          <DialogDescription>The horse is added to your list and selected for this booking.</DialogDescription>
        </DialogHeader>
        <HorseForm
          mode="create"
          compact
          onCancel={() => onOpenChange(false)}
          onSaved={(horse) => {
            onOpenChange(false)
            if (horse) onCreated(horse)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
