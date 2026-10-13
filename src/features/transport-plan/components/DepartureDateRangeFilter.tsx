import { useState } from "react"
import { CalendarDays } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"
import { buildDepartureRange } from "../constants"

export function DepartureDateRangeFilter({ from, to, onChange }: {
  from?: string; to?: string
  onChange: (range: { departureFrom?: string; departureTo?: string }) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ from: from ?? "", to: to ?? "" })
  const [error, setError] = useState("")
  function apply(clear = false) {
    try {
      onChange(buildDepartureRange(clear ? "" : draft.from, clear ? "" : draft.to))
      setOpen(false)
    } catch { setError("Departure end date must not precede the start date.") }
  }
  return <Popover open={open} onOpenChange={(next) => {
    if (next) { setDraft({ from: from ?? "", to: to ?? "" }); setError("") }
    setOpen(next)
  }}>
    <PopoverTrigger asChild><Button variant="outline" className="h-8 w-full min-w-0 justify-start rounded-[2px] border-slate-300 bg-white px-2.5 text-xs shadow-none" aria-label="Departure Date Range">
      <CalendarDays className="size-3.5 shrink-0" /><span className="truncate" title={from || to ? `${from ?? "Any date"} → ${to ?? "Any date"}` : undefined}>{from || to ? `${from ?? "Any date"} → ${to ?? "Any date"}` : "Departure Date Range"}</span>
    </Button></PopoverTrigger>
    <PopoverContent align="end" className="w-72 space-y-3 rounded-[2px] p-4 motion-reduce:animate-none">
      <h3 className="text-sm font-semibold">Departure Date Range</h3>
      <div className="space-y-1"><p className="text-xs text-slate-500">From</p><DatePicker aria-label="Departure from" placeholder="Select start date" value={draft.from} maxDate={draft.to || undefined} onChange={(value) => setDraft((current) => ({ ...current, from: value }))} /></div>
      <div className="space-y-1"><p className="text-xs text-slate-500">To</p><DatePicker aria-label="Departure to" placeholder="Select end date" value={draft.to} minDate={draft.from || undefined} onChange={(value) => setDraft((current) => ({ ...current, to: value }))} /></div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-between gap-2 border-t border-slate-100 pt-3"><Button variant="outline" size="sm" className="rounded-[2px] motion-reduce:transition-none" onClick={() => apply(true)}>Clear</Button><Button size="sm" className="rounded-[2px] motion-reduce:transition-none" onClick={() => apply()}>Apply</Button></div>
    </PopoverContent>
  </Popover>
}
