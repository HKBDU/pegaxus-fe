import type { ReactNode } from "react"
import { PriceListStatusBadge } from "@/features/price-list/components/PriceListStatusBadge"
import { panelClass } from "@/features/price-list/components/PriceListPrimitives"
import type { PriceListDetail } from "@/features/price-list/types"
import { formatRate, getCreatedByLabel } from "@/features/price-list/utils"
import { cn } from "@/lib/utils"
import { DateTimeUtc } from "@/shared/components/DateTimeUtc"

interface PriceListHeaderCardProps {
  priceList: PriceListDetail
  /** The action bar (Edit, Activate, Clone, Add price line), decided by the page. */
  actions?: ReactNode
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="font-heading text-[11px] font-medium uppercase leading-4 tracking-[0.06em] text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-xs leading-5 text-gray-800">{children}</dd>
    </div>
  )
}

/** Name, status and the numbers every invoice takes from this list: currency, VAT and deposit rate. */
export function PriceListHeaderCard({ priceList, actions }: PriceListHeaderCardProps) {
  const createdBy = getCreatedByLabel(priceList.createdByAccountId)
  return (
    <section aria-label="Price list" className={cn(panelClass, "p-4")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="m-0! font-heading text-base! leading-5! font-bold! tracking-normal! text-gray-900! [overflow-wrap:anywhere]">{priceList.name}</h2>
          <PriceListStatusBadge isActive={priceList.isActive} />
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div> : null}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-gray-100 pt-3 sm:grid-cols-3 lg:grid-cols-6">
        <Fact label="Currency">{priceList.currency}</Fact>
        <Fact label="VAT">{formatRate(priceList.taxRate)}</Fact>
        <Fact label="Deposit">{formatRate(priceList.depositRate)}</Fact>
        {createdBy ? <Fact label="Created by">{createdBy}</Fact> : null}
        <Fact label="Created (UTC)">
          <DateTimeUtc value={priceList.createdAt} compact />
        </Fact>
        <Fact label="Updated (UTC)">
          <DateTimeUtc value={priceList.updatedAt} compact />
        </Fact>
      </dl>
    </section>
  )
}
