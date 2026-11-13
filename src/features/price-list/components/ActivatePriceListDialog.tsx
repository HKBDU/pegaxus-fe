import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { HorseLoader } from "@/shared/components/common/HorseLoader";
import type { PriceListHeader } from "../header.schemas";
import { useActivatePriceList } from "../hooks/usePriceListHeaderMutations";
import { getPriceListHeaderErrorMessage } from "../services/header";

export interface ActivatePriceListDialogProps {
  priceList: Pick<PriceListHeader, "priceListId" | "name" | "isActive">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActivated: (priceList: PriceListHeader) => void;
}
export function ActivatePriceListDialog(props: ActivatePriceListDialogProps) {
  const mutation = useActivatePriceList(props.priceList.priceListId);
  return (
    <Dialog
      open={props.open}
      onOpenChange={(next) => {
        if (!mutation.isPending) props.onOpenChange(next);
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={!mutation.isPending}
        onEscapeKeyDown={(event) => {
          if (mutation.isPending) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (mutation.isPending) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Activate price list</DialogTitle>
          <DialogDescription>
            Replace the currently active price list.
          </DialogDescription>
        </DialogHeader>
        {props.open ? (
          <Activation
            key={`${mutation.scope}:${props.priceList.priceListId}`}
            {...props}
            mutation={mutation}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
function Activation({
  priceList,
  onActivated,
  onOpenChange,
  mutation,
}: ActivatePriceListDialogProps & {
  mutation: ReturnType<typeof useActivatePriceList>;
}) {
  const [error, setError] = useState<unknown>(null);
  async function activate() {
    if (mutation.isPending || mutation.rateLimited || !mutation.allowed) return;
    setError(null);
    let result: PriceListHeader;
    try {
      result = await mutation.mutateAsync();
    } catch (failure) {
      if (mutation.isCurrent()) setError(failure);
      return;
    }
    if (!mutation.isCurrent()) return;
    toast.success("Price list activated. The previous list was deactivated.");
    onActivated(result);
    onOpenChange(false);
  }
  return (
    <div className="space-y-4" aria-busy={mutation.isPending}>
      <p className="break-words text-sm">
        Activate <strong>{priceList.name}</strong>? The currently active price
        list will be deactivated automatically.
      </p>
      <p className="text-sm text-muted-foreground">
        Invoices created or saved from now on use this list's prices, VAT and
        deposit rate. Existing invoice snapshots remain unchanged until an
        authorized recalculation.
      </p>
      {!mutation.allowed || error ? (
        <p
          role="alert"
          className="border-l-2 border-destructive bg-red-50 p-3 text-sm text-destructive"
        >
          {!mutation.allowed
            ? "Only Logistics Managers can activate price lists."
            : getPriceListHeaderErrorMessage(error)}
        </p>
      ) : null}
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          disabled={mutation.isPending}
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button
          type="button"
          disabled={
            mutation.isPending || mutation.rateLimited || !mutation.allowed
          }
          onClick={() => void activate()}
        >
          {mutation.isPending ? (
            <HorseLoader size="button" label="Activating price list" />
          ) : null}
          {mutation.isPending ? "Activating..." : "Confirm & activate"}
        </Button>
      </DialogFooter>
    </div>
  );
}
