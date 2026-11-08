import { Copy } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenuItem } from "@/shared/components/ui/dropdown-menu";
import type { PriceListHeader } from "../header.schemas";
import { useClonePriceList } from "../hooks/usePriceListHeaderMutations";
import { getPriceListHeaderErrorMessage } from "../services/header";

interface ClonePriceListMenuItemProps {
  priceList: Pick<PriceListHeader, "priceListId" | "name">;
  className?: string;
  onCloned: (priceList: PriceListHeader) => void;
}

/**
 * "Clone" as a row menu item. Same rules as `ClonePriceListButton`, but the menu stays open while the request runs
 * (closing it would unmount the item and drop the result); the caller moves on to the copy once it is created.
 */
export function ClonePriceListMenuItem({ priceList, className, onCloned }: ClonePriceListMenuItemProps) {
  const mutation = useClonePriceList(priceList.priceListId);

  async function clone() {
    if (mutation.isPending || mutation.rateLimited || !mutation.allowed) return;
    let result: PriceListHeader;
    try {
      result = await mutation.mutateAsync();
    } catch (error) {
      if (mutation.isCurrent()) toast.error(getPriceListHeaderErrorMessage(error));
      return;
    }
    if (!mutation.isCurrent()) return;
    toast.success("Copy created. Edit it, then activate.");
    onCloned(result);
  }

  return (
    <DropdownMenuItem
      className={className}
      disabled={mutation.isPending || mutation.rateLimited || !mutation.allowed}
      onSelect={(event) => {
        event.preventDefault();
        void clone();
      }}
    >
      <Copy className="size-3.5 text-amber-600" />
      {mutation.isPending ? "Cloning..." : "Clone"}
    </DropdownMenuItem>
  );
}
