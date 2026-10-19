import { CalendarClock, MapPin, PlayCircle } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { VALIDATION_LIMITS } from "@/shared/constants/validation-limits"
import { TYPE_LABEL, type HandoverAudience, type HandoverType } from "../constants"
import type { CreateHandoverInput, HandoverBoundary, OverviewSegment } from "../types"
import { describeError, typeLabel } from "../utils"
import { StatusBadge } from "./StatusBadge"

interface Props {
  audience: HandoverAudience
  boundaries: HandoverBoundary[]
  legs: Map<string, OverviewSegment>
  /** Boundary and type chosen by the link from the transport page (`.../new?handoverType&fromRoutePlanRouteId&toRoutePlanRouteId`). */
  preset: { from: string | null; to: string | null; type: string | null }
  pending: boolean
  backHref: string
  recordHref: (handoverRecordId: string) => string
  /** Creates the record. Throw to show the error under the form; the page handles navigation and `HANDOVER_ALREADY_EXISTS`. */
  onSubmit: (input: CreateHandoverInput) => Promise<void>
}

const legName = (segment?: OverviewSegment) => (segment ? `#${segment.displayOrder} ${segment.fromLocation.locationName} → ${segment.toLocation.locationName}` : "—")

/** Local date-time input value -> ISO with the browser offset. */
const toIso = (local: string) => new Date(local).toISOString()

/**
 * HO3 form: pick the handover point, the type and when. The boundaries come from OT4 and the buttons follow only `canCreate`
 * and `allowedHandoverTypes`; which pair of legs is valid stays a server rule. Parties and place are filled in by the BE.
 */
export function StartForm({ audience, boundaries, legs, preset, pending, backHref, recordHref, onSubmit }: Props) {
  const [pickedBoundary, setPickedBoundary] = useState<number | null>(null)
  const [pickedType, setPickedType] = useState<string | null>(null)
  const [schedule, setSchedule] = useState(false)
  const [plannedAt, setPlannedAt] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  // The link from the transport page carries the boundary in the query: use it until the person picks another.
  const creatable = boundaries.filter((boundary) => boundary.canCreate)
  const fromLink = creatable.find((boundary) => (boundary.fromRoutePlanRouteId ?? null) === preset.from && (boundary.toRoutePlanRouteId ?? null) === preset.to)
  const selected: HandoverBoundary | undefined =
    boundaries.find((boundary) => boundary.boundaryNo === pickedBoundary) ?? (preset.from || preset.to ? fromLink : creatable.length === 1 ? creatable[0] : undefined)
  const types = selected?.allowedHandoverTypes ?? []
  const type = pickedType && types.includes(pickedType) ? pickedType : preset.type && types.includes(preset.type) ? preset.type : types[0]

  const canSchedule = audience === "admin"
  const scheduled = canSchedule && schedule

  const submit = async () => {
    setFormError(null)
    if (!selected || !type) return
    if (scheduled) {
      if (!plannedAt) {
        setFormError("Choose the planned date and time.")
        return
      }
      const plannedDate = new Date(plannedAt)
      if (Number.isNaN(plannedDate.getTime())) {
        setFormError("Invalid date and time.")
        return
      }
      const now = new Date()
      const diffYears = Math.abs(plannedDate.getFullYear() - now.getFullYear())
      if (diffYears > VALIDATION_LIMITS.dateWindowYears) {
        setFormError(`Planned handover must be within ${VALIDATION_LIMITS.dateWindowYears} years of today.`)
        return
      }
    }
    try {
      await onSubmit({
        handoverType: type,
        fromRoutePlanRouteId: selected.fromRoutePlanRouteId ?? null,
        toRoutePlanRouteId: selected.toRoutePlanRouteId ?? null,
        startNow: !scheduled,
        ...(scheduled ? { plannedHandoverAt: toIso(plannedAt) } : {}),
      })
    } catch (error) {
      setFormError(describeError(error))
    }
  }

  return (
    <>
      <section aria-label="Handover points" className="space-y-2">
        <h2 className="font-heading text-sm! leading-5! font-semibold tracking-[0.06em] text-gray-800 uppercase">1. Choose the handover point</h2>
        <ul className="grid gap-2 lg:grid-cols-2" role="radiogroup" aria-label="Handover point">
          {boundaries.map((boundary) => {
            const active = selected?.boundaryNo === boundary.boundaryNo
            const existing = boundary.existingHandover
            return (
              <li key={boundary.boundaryNo}>
                <div className={cn("flex h-full flex-col gap-2 rounded-[2px] border bg-white p-3 sm:p-4", active ? "border-primary ring-2 ring-primary/20" : "border-slate-300", !boundary.canCreate && "bg-gray-50")}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={!boundary.canCreate}
                    onClick={() => { setPickedBoundary(boundary.boundaryNo); setPickedType(null); setFormError(null) }}
                    className="min-h-12 w-full cursor-pointer space-y-1 rounded-[2px] text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center gap-1.5 font-heading text-xs font-semibold tracking-[0.06em] text-gray-500 uppercase">
                      <MapPin aria-hidden="true" className="size-3.5" /> Point {boundary.boundaryNo}
                    </span>
                    <span className={cn("block text-sm font-bold break-words", boundary.canCreate ? "text-gray-900" : "text-gray-500")}>{boundary.location.locationName}</span>
                    <span className="block text-xs break-words text-gray-600">
                      {boundary.fromRoutePlanRouteId ? legName(legs.get(boundary.fromRoutePlanRouteId)) : "Start of the transport"}
                      <span aria-hidden="true"> | </span>
                      {boundary.toRoutePlanRouteId ? legName(legs.get(boundary.toRoutePlanRouteId)) : "End of the transport"}
                    </span>
                    <span className="flex flex-wrap gap-1 pt-1">
                      {boundary.allowedHandoverTypes.map((allowed) => (
                        <span key={allowed} className="rounded-[2px] bg-[#e9e6de] px-1.5 py-0.5 font-heading text-[0.6875rem] font-medium tracking-[0.06em] text-gray-700 uppercase">
                          {typeLabel(allowed)}
                        </span>
                      ))}
                    </span>
                  </button>
                  {existing ? (
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2">
                      <span className="flex items-center gap-2 text-xs text-gray-600">
                        {existing.handoverCode} <StatusBadge status={existing.status} />
                      </span>
                      <Link to={recordHref(existing.handoverRecordId)} className="inline-flex min-h-11 items-center font-heading text-xs font-semibold tracking-[0.06em] text-primary uppercase hover:underline sm:min-h-8">
                        View record
                      </Link>
                    </div>
                  ) : !boundary.canCreate ? (
                    <p className="mt-auto border-t border-slate-200 pt-2 text-xs text-gray-500">A handover cannot be created here right now.</p>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-label="Handover type" className={cn("space-y-2", !selected && "opacity-60")}>
        <h2 className="font-heading text-sm! leading-5! font-semibold tracking-[0.06em] text-gray-800 uppercase">2. Type and timing</h2>
        <div className="space-y-3 rounded-[2px] border border-slate-300 bg-white p-3 sm:p-4">
          <fieldset disabled={!selected} className="min-w-0">
            <legend className="mb-1 font-heading text-[0.6875rem] font-semibold tracking-[0.06em] text-gray-500 uppercase">Type</legend>
            <div className="flex flex-wrap gap-2">
              {types.length === 0 ? <p className="text-sm text-gray-500">Choose a handover point first.</p> : null}
              {types.map((allowed) => (
                <button
                  key={allowed}
                  type="button"
                  aria-pressed={type === allowed}
                  onClick={() => { setPickedType(allowed); setFormError(null) }}
                  className={cn("min-h-11 rounded-[2px] border px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:min-h-9", type === allowed ? "border-primary bg-primary text-white" : "border-slate-300 bg-white text-gray-800 hover:bg-primary/5")}
                >
                  {TYPE_LABEL[allowed as HandoverType] ?? allowed}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">Parties and place are filled in automatically from the route when the handover is created.</p>
          </fieldset>

          {canSchedule ? (
            <div className="space-y-2 border-t border-slate-200 pt-3">
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-gray-800 sm:min-h-8">
                <input type="checkbox" checked={schedule} onChange={(event) => setSchedule(event.target.checked)} className="size-4 accent-primary" />
                <CalendarClock aria-hidden="true" className="size-4 text-gray-500" />
                Schedule for later instead of starting now (status Planned)
              </label>
              {schedule ? (
                <div className="max-w-xs space-y-1">
                  <label htmlFor="planned-at" className="font-heading text-[0.6875rem] font-semibold tracking-[0.06em] text-gray-500 uppercase">Planned at <span className="text-red-600">*</span></label>
                  <Input id="planned-at" type="datetime-local" value={plannedAt} onChange={(event) => setPlannedAt(event.target.value)} className="h-11 rounded-[2px] border-slate-300 bg-white text-base shadow-none sm:h-9 sm:text-sm" />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {formError ? <p role="alert" className="rounded-[2px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p> : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline" className="min-h-12 rounded-[2px] sm:min-h-10">
          <Link to={backHref}>Cancel</Link>
        </Button>
        <Button type="button" onClick={() => void submit()} disabled={!selected || !type || pending} className="min-h-12 gap-2 rounded-[2px] font-heading font-semibold tracking-[0.06em] uppercase shadow-[0.125rem_0.125rem_0_0_rgb(0_0_0/0.85)] sm:min-h-10">
          <PlayCircle aria-hidden="true" className="size-4" />
          {pending ? "Saving…" : scheduled ? "Schedule handover" : "Start handover"}
        </Button>
      </div>
    </>
  )
}
