import { AlertOctagon, BadgeDollarSign, ReceiptText, ShieldAlert, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/shared/components/ui/skeleton"

import { useIncidentKpis } from "../hooks/useIncidents"

interface CardProps {
  label: string
  value: number | undefined
  hint: string
  icon: LucideIcon
  tone: string
  loading: boolean
}

function KpiCard({ label, value, hint, icon: Icon, tone, loading }: CardProps) {
  return (
    <div className="booking-panel booking-panel-hover flex items-center gap-3 rounded-[2px] border bg-white px-4 py-3">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-[2px]", tone)}>
        <Icon className="size-[18px]" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="font-heading text-[11px] font-medium uppercase leading-4 tracking-[0.06em] text-gray-500">{label}</p>
        {loading ? <Skeleton className="mt-1 h-6 w-12 rounded-none bg-slate-100" /> : <p className="text-2xl font-semibold leading-7 text-gray-900">{value ?? "—"}</p>}
        <p className="truncate text-[11px] leading-4 text-gray-500">{hint}</p>
      </div>
    </div>
  )
}

/** Four cards above the list; the numbers come from IN7 (`counts` + one-row queries). */
export function IncidentKpiCards() {
  const kpis = useIncidentKpis()
  const loading = kpis.isLoading
  return (
    <section aria-label="Incident summary" className="booking-stagger grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard loading={loading} label="Total open incidents" value={kpis.open} hint={kpis.total === undefined ? "Reported + pending" : `of ${kpis.total} total`} icon={ShieldAlert} tone="bg-amber-50 text-amber-600" />
      <KpiCard loading={loading} label="Critical" value={kpis.critical} hint="Open and needs action now" icon={AlertOctagon} tone="bg-red-50 text-red-600" />
      <KpiCard loading={loading} label="Pending cost approvals" value={kpis.pendingCost} hint="Waiting for a decision" icon={ReceiptText} tone="bg-sky-50 text-sky-600" />
      <KpiCard loading={loading} label="Settlement required" value={kpis.settlement} hint="Emergency costs to settle" icon={BadgeDollarSign} tone="bg-emerald-50 text-emerald-600" />
    </section>
  )
}
