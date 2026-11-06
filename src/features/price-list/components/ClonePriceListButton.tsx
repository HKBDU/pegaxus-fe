import type { ComponentProps } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { HorseLoader } from "@/shared/components/common/HorseLoader";
import type { PriceListHeader } from "../header.schemas";
import { useClonePriceList } from "../hooks/usePriceListHeaderMutations";
import { getPriceListHeaderErrorMessage } from "../services/header";

export interface ClonePriceListButtonProps {
  priceList: Pick<PriceListHeader, "priceListId" | "name">;
  onCloned: (priceList: PriceListHeader) => void;
  variant?: ComponentProps<typeof Button>["variant"];
}
export function ClonePriceListButton({
  priceList,
  onCloned,
  variant = "outline",
}: ClonePriceListButtonProps) {
  const mutation = useClonePriceList(priceList.priceListId);
  async function clone() {
    if (mutation.isPending || mutation.rateLimited || !mutation.allowed) return;
    let result: PriceListHeader;
    try {
      result = await mutation.mutateAsync();
    } catch (error) {
      if (mutation.isCurrent())
        toast.error(getPriceListHeaderErrorMessage(error));
      return;
    }
    if (!mutation.isCurrent()) return;
    toast.success("Copy created. Edit it, then activate.");
    onCloned(result);
  }
  return (
    <Button
      type="button"
      variant={variant}
      className="rounded-[2px]"
      aria-label={`Clone ${priceList.name}`}
      aria-busy={mutation.isPending}
      title={
        !mutation.allowed
          ? "Only Logistics Managers can clone price lists."
          : undefined
      }
      disabled={mutation.isPending || mutation.rateLimited || !mutation.allowed}
      onClick={() => void clone()}
    >
      {mutation.isPending ? (
        <HorseLoader size="button" label="Cloning price list" />
      ) : (
        <Copy aria-hidden="true" className="size-4" />
      )}
      {mutation.isPending ? "Cloning..." : "Clone"}
    </Button>
  );
}
