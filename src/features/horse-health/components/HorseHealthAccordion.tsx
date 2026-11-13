import { ChevronDown, Clock3, FileClock, MapPin, NotebookPen, UserRound } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/shared/components/ui/button"
import { formatUtcDateTime } from "@/shared/utils/datetime"

import { HORSE_HEALTH_ROUTES } from "../constants"
import type { HorseHealthOverviewItem } from "../types"
import { HealthStatusBadge } from "./HealthStatusBadge"
import { healthPanel } from "./health-ui"

function formatDate(value: string | null | undefined) {
  return formatUtcDateTime(value)
}

function Detail({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-[11px] text-slate-500">{label}</dt>
        <dd className="m-0 text-xs font-medium break-words text-slate-800">{value}</dd>
      </div>
    </div>
  )
}

export function HorseHealthAccordion({ item, transportId, historyHref }: { item: HorseHealthOverviewItem; transportId: string; historyHref?: (horseId: string) => string }) {
  const [open, setOpen] = useState(false)
  const log = item.latestLog
  const historyLink = historyHref?.(item.horse.horseId) ?? HORSE_HEALTH_ROUTES.history(transportId, item.horse.horseId)

  return (
    <article className={healthPanel}>
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50/70"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-slate-900">{item.horse.horseName}</span>
            {item.detachedAt ? (
              <span className="rounded-xs border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                Left behind · {formatDate(item.detachedAt)}
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-slate-500">
            Microchip {item.horse.microchipNumber ?? "—"} · Passport {item.horse.passportNumber ?? "—"}
          </span>
        </span>
        {/* The latest status was only hinted by the name colour; a badge states it. */}
        <HealthStatusBadge status={item.latestHealthStatus} />
        <ChevronDown className={`size-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`} aria-hidden={!open}>
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-3 border-t border-slate-100 px-4 py-3">
            <dl className="m-0 grid gap-3 sm:grid-cols-2">
              <Detail icon={Clock3} label="Last checked" value={formatDate(log?.checkedAt)} />
              <Detail icon={UserRound} label="Checked by" value={log?.checkedBy.fullName ?? "—"} />
              <Detail icon={MapPin} label="Location" value={log?.locationDescription ?? "—"} />
              <Detail icon={NotebookPen} label="Latest note" value={log?.latestNote ?? "—"} />
            </dl>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <span className="text-[11px] font-medium text-slate-500">
                {item.logCount} health {item.logCount === 1 ? "log" : "logs"}
              </span>
              {item.logCount > 0 ? (
                <Button asChild variant="outline" size="sm" className="rounded-xs">
                  <Link to={historyLink}>
                    <FileClock aria-hidden="true" />
                    View check history
                  </Link>
                </Button>
              ) : (
                <Button type="button" variant="outline" size="sm" disabled className="rounded-xs">
                  <FileClock aria-hidden="true" />
                  View check history
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
