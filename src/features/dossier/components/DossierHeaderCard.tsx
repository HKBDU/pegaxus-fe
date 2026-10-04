import type { ReactNode } from "react"

import { DossierProgressBar } from "@/features/dossier/components/DossierProgressBar"
import { DossierStatusBadge } from "@/features/dossier/components/DossierStatusBadge"
import type { DossierOverview } from "@/features/dossier/types"
import { formatDossierDate } from "@/features/dossier/utils"

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 px-4 py-3 first:pl-0 sm:border-l sm:border-slate-200 sm:first:border-l-0">
      <dt className="font-heading text-[10px] font-medium uppercase tracking-[0.1em] text-slate-400">{label}</dt>
      <dd className="m-0 mt-1 flex min-h-5 items-center text-sm font-semibold text-slate-900">{children}</dd>
    </div>
  )
}

/** Summary of the dossier (D7) shown above its tabs. Route and horse count are not part of D7 yet. */
export function DossierHeaderCard({ overview }: { overview: DossierOverview }) {
  return (
    <dl className="booking-panel m-0 grid gap-y-1 border bg-white px-5 py-1 sm:grid-cols-[1.2fr_1.2fr_1fr_1.4fr_1fr]">
      <Cell label="Booking code"><span className="break-all">{overview.bookingCode}</span></Cell>
      <Cell label="Dossier code"><span className="break-all">{overview.dossierCode}</span></Cell>
      <Cell label="Status"><DossierStatusBadge status={overview.status} /></Cell>
      <Cell label="Progress">
        <DossierProgressBar percent={overview.progressPercent} className="w-full" />
      </Cell>
      <Cell label="Opened">{formatDossierDate(overview.openedAt)}</Cell>
    </dl>
  )
}
