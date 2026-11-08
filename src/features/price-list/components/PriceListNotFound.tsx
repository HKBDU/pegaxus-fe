import { Link } from "react-router-dom"
import { outlineButtonClass, panelClass } from "@/features/price-list/components/PriceListPrimitives"
import { cn } from "@/lib/utils"

/** 404 PRICE_LIST_NOT_FOUND, or an id that is not even shaped like one. */
export function PriceListNotFound({ listHref }: { listHref: string }) {
  return (
    <div role="alert" className={cn(panelClass, "flex flex-col items-start gap-3 p-6")}>
      <h2 className="m-0! font-heading text-base! font-bold! uppercase tracking-normal! text-gray-900!">Price list not found</h2>
      <p className="m-0 text-xs text-gray-600">This price list no longer exists, or the link is wrong.</p>
      <Link to={listHref} className={cn(outlineButtonClass, "inline-flex items-center no-underline")}>Back to price lists</Link>
    </div>
  )
}
