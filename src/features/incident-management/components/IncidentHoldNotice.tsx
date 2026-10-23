import { useEffect, useState } from "react"
import { Hourglass } from "lucide-react"

import type { IncidentHold } from "../types"
import { formatDateTime, placeLine, roleLabel } from "../utils"
import { FieldGrid, InfoRow } from "./ui"

function remaining(holdUntil: string, now: number) {
  const minutes = Math.max(0, Math.ceil((new Date(holdUntil).getTime() - now) / 60_000))
  if (minutes === 0) return "Hold time is over"
  const hours = Math.floor(minutes / 60)
  return `${hours ? `${hours} h ` : ""}${minutes % 60} min left`
}

/** Hold & Wait decided by the Logistics Manager (IN8 `hold`): the countdown ticks while the page stays open. */
export function IncidentHoldNotice({ hold }: { hold: IncidentHold }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])
  const active = hold.status === "ACTIVE"
  return (
    <section className={`border px-4 py-3 ${active ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50"}`} aria-label="Route hold">
      <div className="flex flex-wrap items-center gap-2">
        <Hourglass className={`size-4 ${active ? "text-amber-600" : "text-slate-400"}`} aria-hidden="true" />
        <h2 className="m-0! font-heading text-sm! font-bold! tracking-normal! text-gray-900! uppercase">Route on hold</h2>
        <span className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-medium ${active ? "border-amber-300 bg-white text-amber-800" : "border-slate-300 bg-white text-slate-600"}`}>
          {active ? remaining(hold.holdUntil, now) : "Expired"}
        </span>
      </div>
      <p className="m-0 mt-2 text-sm leading-6 text-gray-800">{hold.reason}</p>
      <FieldGrid className="mt-3 lg:grid-cols-4">
        <InfoRow label="Decided by">{hold.decidedBy.fullName} ({roleLabel(hold.decidedBy.role)})</InfoRow>
        <InfoRow label="Hold until">{formatDateTime(hold.holdUntil)}</InfoRow>
        <InfoRow label="Safe stop">{hold.safeStopLocation ? placeLine(hold.safeStopLocation) : null}</InfoRow>
        <InfoRow label="Check every">{`${hold.monitorIntervalMinutes} min`}</InfoRow>
      </FieldGrid>
    </section>
  )
}
