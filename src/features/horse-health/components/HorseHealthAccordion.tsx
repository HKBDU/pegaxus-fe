import { ChevronDown, Clock3, FileClock, MapPin, UserRound } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

import { HORSE_HEALTH_ROUTES } from "../constants"
import type { HorseHealthOverviewItem } from "../types"

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
}

export function HorseHealthAccordion({ item, transportId, historyHref }: { item: HorseHealthOverviewItem; transportId: string; historyHref?: (horseId: string) => string }) {
  const [open, setOpen] = useState(false)
  const log = item.latestLog
  const horseNameTone = item.latestHealthStatus === "CRITICAL"
    ? "text-red-600"
    : item.latestHealthStatus === "NORMAL"
      ? "text-[#181818]"
      : "text-[#f39200]"

  return <article className="border border-slate-300 bg-white">
    <button type="button" className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <span className="min-w-0 flex-1"><span className={`block truncate text-base font-bold ${horseNameTone}`}>{item.horse.horseName}</span><span className="mt-1 block truncate text-xs text-slate-500">Microchip: {item.horse.microchipNumber ?? "—"}</span><span className="block truncate text-xs text-slate-500">Passport: {item.horse.passportNumber ?? "—"}</span></span>
      <ChevronDown className={`size-5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
    <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`} aria-hidden={!open}>
      <div className="min-h-0 overflow-hidden">
        <div className="space-y-4 border-t border-slate-300 px-4 py-4">
          <div className="grid gap-3 text-sm sm:grid-cols-2"><div className="flex items-start gap-2"><Clock3 className="mt-0.5 size-4 text-slate-500" /><span><span className="block text-xs text-slate-500">Last checked</span><span className="font-medium text-[#181818]">{formatDate(log?.checkedAt)}</span></span></div><div className="flex items-start gap-2"><UserRound className="mt-0.5 size-4 text-slate-500" /><span><span className="block text-xs text-slate-500">Checked by</span><span className="font-medium text-[#181818]">{log?.checkedBy.fullName ?? "—"}</span></span></div><div className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 text-slate-500" /><span className="font-medium text-[#181818]">{log?.locationDescription ?? "—"}</span></div><div><span className="block text-xs text-slate-500">Latest note</span><span className="font-medium text-[#181818]">{log?.latestNote ?? "—"}</span></div></div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-300 pt-3"><span className="text-xs font-medium text-slate-500">{item.logCount} health log{item.logCount === 1 ? "" : "s"}</span>{item.logCount > 0 ? <Link to={historyHref?.(item.horse.horseId) ?? HORSE_HEALTH_ROUTES.history(transportId, item.horse.horseId)} className="inline-flex items-center gap-2 bg-[#f39200] px-3 py-2 text-sm font-semibold text-[#181818] hover:bg-[#e08600]"><FileClock className="size-4" />View check history</Link> : <button type="button" disabled className="inline-flex cursor-not-allowed items-center gap-2 bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-500"><FileClock className="size-4" />View check history</button>}</div>
        </div>
      </div>
    </div>
  </article>
}
