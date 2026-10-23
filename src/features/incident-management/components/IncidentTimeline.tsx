import { useMemo } from "react"

import type { IncidentLike } from "../types"
import { formatDateTime, titleCase } from "../utils"
import { Panel } from "./ui"

interface Entry {
  at: string
  label: string
}

/** Built from the incident itself (IN8); the contract has no timeline endpoint. Staff also see the cost steps. */
function buildEntries(incident: IncidentLike): Entry[] {
  const entries: Entry[] = [
    { at: incident.occurredAt, label: "Incident occurred" },
    { at: incident.reportedAt, label: `Reported by ${incident.reportedBy.fullName}` },
  ]
  if ("costRequests" in incident) {
    for (const request of incident.costRequests) {
      entries.push({ at: request.requestedAt, label: `Cost request ${request.requestCode} created (${titleCase(request.category)})` })
      if (request.decision) entries.push({ at: request.decision.decidedAt, label: `Cost request ${request.requestCode} ${request.decision.decision.toLowerCase()}` })
      if (request.cancelledAt) entries.push({ at: request.cancelledAt, label: `Cost request ${request.requestCode} cancelled` })
    }
  }
  for (const change of incident.routeChanges) entries.push({ at: change.updatedAt, label: `Route plan ${change.routePlanCode} (${titleCase(change.routeType)}) ${change.status.toLowerCase()}` })
  if (incident.hold) entries.push({ at: incident.hold.startedAt, label: `Route put on hold for ${incident.hold.holdMinutes} min` })
  if (incident.resolvedAt) entries.push({ at: incident.resolvedAt, label: "Incident resolved" })
  if (incident.cancelledAt) entries.push({ at: incident.cancelledAt, label: "Incident cancelled" })
  return entries.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
}

export function IncidentTimeline({ incident }: { incident: IncidentLike }) {
  const entries = useMemo(() => buildEntries(incident), [incident])
  return (
    <Panel title="Timeline">
      <ol className="m-0 grid list-none gap-0 p-0">
        {entries.map((entry, index) => (
          <li key={`${entry.at}-${index}`} className="relative grid grid-cols-[0.75rem_minmax(0,1fr)] gap-x-3 pb-3 last:pb-0">
            <span aria-hidden="true" className="relative z-10 mt-1.5 size-2 rounded-full bg-[#ef8f00] ring-4 ring-amber-50" />
            {index < entries.length - 1 ? <span aria-hidden="true" className="absolute left-[3px] top-3.5 h-full w-px bg-slate-200" /> : null}
            <div className="min-w-0">
              <p className="m-0 text-xs leading-5 text-gray-900">{entry.label}</p>
              <p className="m-0 text-[11px] leading-4 text-gray-500">{formatDateTime(entry.at)}</p>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  )
}
