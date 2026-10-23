import { Link } from "react-router-dom"
import { Clock, MapPin, Receipt, Truck } from "lucide-react"

import { cn } from "@/lib/utils"
import { CategoryBadge, SeverityBadge, StatusBadge } from "@/shared/components/incident"
import { Skeleton } from "@/shared/components/ui/skeleton"

import { incidentRoutes, severityEdge } from "../constants"
import type { IncidentListItem } from "../types"
import { formatDate, formatTime, placeLine, roleLabel } from "../utils"

/** Phone version of the incident table: one tappable card per row (the table itself is hidden below `md`). */
export function IncidentCardList({ items, isLoading }: { items: IncidentListItem[]; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <div className="grid gap-2 md:hidden" aria-busy="true">
        {[0, 1, 2].map((key) => <Skeleton key={key} className="h-32 w-full rounded-[2px] bg-slate-100" />)}
      </div>
    )
  }
  if (!items.length) {
    return <p className="m-0 border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500 md:hidden">No incidents match the current filters.</p>
  }
  return (
    <ul className="m-0 grid list-none gap-2 p-0 md:hidden">
      {items.map((item) => (
        <li key={item.incidentReportId}>
          <Link
            to={incidentRoutes.adminDetail(item.incidentReportId)}
            className={cn("block rounded-[2px] border border-l-4 border-[#e5e2d9] bg-white p-3 transition-colors active:bg-amber-50", severityEdge[item.severity] ?? "border-l-slate-300")}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="m-0 font-heading text-base font-bold leading-5 text-slate-900">{item.incidentCode}</p>
                <p className="m-0 mt-0.5 line-clamp-2 text-sm leading-5 text-slate-700">{item.title}</p>
              </div>
              <SeverityBadge severity={item.severity} />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <CategoryBadge category={item.category} />
              <StatusBadge status={item.status} />
              {item.emergencySettlementRequired ? <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Settlement</span> : null}
            </div>

            <dl className="m-0 mt-2.5 grid gap-1 text-xs text-slate-600">
              <div className="flex items-center gap-1.5"><Truck className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" /><dd className="m-0 truncate"><span className="font-semibold text-slate-800">{item.transport.transportCode}</span> · {item.reportedBy.fullName} ({roleLabel(item.reportedBy.role)})</dd></div>
              <div className="flex items-center gap-1.5"><MapPin className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" /><dd className="m-0 truncate">{placeLine(item.location)}</dd></div>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5"><Clock className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />{formatDate(item.occurredAt)}, {formatTime(item.occurredAt)}</span>
                <span className="flex items-center gap-1.5"><Receipt className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                  {item.costRequestCount}
                  {item.pendingCostCount > 0 ? <span className="font-semibold text-amber-700">({item.pendingCostCount} pending)</span> : null}
                </span>
              </div>
            </dl>
          </Link>
        </li>
      ))}
    </ul>
  )
}
