import { Link } from "react-router-dom"
import { ROLE_ROUTES } from "@/app/route-config"
import { canAccess } from "@/features/auth/access-control"
import { useAuthStore } from "@/features/auth/store"
import { QUOTATION_BANNER_TEXT } from "@/features/invoice/constants"

export function QuotationBanner() {
  const principal = useAuthStore((state) => state.principal)
  // Price lists are a Logistics Manager screen; a customer reading the quotation gets no link to it.
  const canViewPriceLists = canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })

  return (
    <div className="rounded-[2px] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">
      {QUOTATION_BANNER_TEXT}
      {canViewPriceLists ? (
        <>
          {" · "}
          <Link to={ROLE_ROUTES.priceLists} className="font-medium underline underline-offset-2 hover:text-amber-950">
            View price lists
          </Link>
        </>
      ) : null}
    </div>
  )
}
