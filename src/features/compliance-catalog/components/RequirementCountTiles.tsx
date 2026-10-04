import { ClipboardList, FileText, Luggage } from "lucide-react"

interface RequirementCountTilesProps {
  total: number
  horse: number
  trip: number
  totalLabel?: string
}

/** Total / horse-related / trip-level counters used by the preview, the customize summary and the review step. */
export function RequirementCountTiles({ total, horse, trip, totalLabel = "Total requirements" }: RequirementCountTilesProps) {
  const tiles = [
    { label: totalLabel, value: total, hint: "All required documents", icon: FileText },
    { label: "Horse-related", value: horse, hint: "Per horse documents", icon: ClipboardList },
    { label: "Trip-level", value: trip, hint: "Booking and transport documents", icon: Luggage },
  ]

  return (
    <dl className="m-0 grid grid-cols-3 gap-2">
      {tiles.map(({ label, value, hint, icon: Icon }) => (
        <div key={label} className="min-w-0 rounded-[2px] border border-slate-200 bg-white p-3">
          <Icon className="size-3.5 text-amber-600" aria-hidden="true" />
          <dd className="m-0 mt-1 text-xl font-bold leading-6 text-slate-900">{value}</dd>
          <dt className="text-[0.7rem] font-semibold leading-4 text-slate-700">{label}</dt>
          <p className="m-0 mt-0.5 text-[0.65rem] leading-3 text-slate-400">{hint}</p>
        </div>
      ))}
    </dl>
  )
}
