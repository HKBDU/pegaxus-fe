import { useState } from "react"
import { MapPin } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"
import { Textarea } from "@/shared/components/ui/textarea"

import { useDetachHorse } from "../hooks/useIncidents"
import type { Incident } from "../types"
import { IncidentErrorAlert } from "./IncidentErrorAlert"

const NOTE_MAX = 1000

interface DetachHorseDialogProps {
  incident: Incident
  horse: { horseId: string; horseName: string } | null
  onOpenChange: (open: boolean) => void
  onReload: () => void
}

/**
 * Leave a horse that cannot continue at a stop of the route, in the care of a local veterinary facility (their staff, not ours).
 * The rest of the transport travels on; the crew and the customer are told, and the customer can book the horse's return.
 */
export function DetachHorseDialog({ incident, horse, onOpenChange, onReload }: DetachHorseDialogProps) {
  const detach = useDetachHorse(incident.incidentReportId)
  const stops = incident.detachLocations ?? []
  // The end of the leg in transit comes last; it is the nearest stop ahead, so it is the default.
  const [picked, setPicked] = useState("")
  const locationId = stops.some((stop) => stop.locationId === picked) ? picked : (stops.at(-1)?.locationId ?? "")
  const [note, setNote] = useState("")
  const [error, setError] = useState<unknown>(null)
  const open = horse !== null

  const close = (next: boolean) => {
    if (!next) {
      setNote("")
      setPicked("")
      setError(null)
      detach.reset()
    }
    onOpenChange(next)
  }

  const submit = async () => {
    if (!horse || !locationId) return
    setError(null)
    try {
      await detach.mutateAsync({ horseId: horse.horseId, lastUpdatedAt: incident.updatedAt, locationId, note: note.trim() || undefined })
      toast.success(`${horse.horseName} was left behind. The crew and the customer were notified.`)
      close(false)
    } catch (caught) {
      setError(caught)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={close}>
      <AlertDialogContent className="gap-3 rounded-[2px] border-slate-200 bg-white p-4 text-slate-900 shadow-[0_14px_35px_rgba(15,23,42,0.16)] data-[size=default]:sm:max-w-[460px]">
        <AlertDialogHeader className="grid grid-rows-none grid-cols-[28px_minmax(0,1fr)] place-items-start gap-2.5 text-left">
          <AlertDialogMedia className="m-0 grid size-7 shrink-0 place-items-center rounded-[2px] bg-amber-50 text-amber-700">
            <MapPin className="size-3.5" />
          </AlertDialogMedia>
          <div className="grid gap-0.5">
            <AlertDialogTitle className="col-auto! m-0! font-heading text-base! leading-5! font-semibold! tracking-normal! text-slate-900">
              Leave {horse?.horseName} behind?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-4 text-slate-600">
              The horse stays at the selected stop in the care of a local veterinary facility. The other horses continue the journey.
              The driver, the escort and the customer are notified; the customer can then book the horse's return trip. This cannot be undone.
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        <div className="grid gap-1">
          <label htmlFor="detach-location" className="font-heading text-[11px] font-medium tracking-[0.04em] text-slate-700 uppercase">
            Stop where the horse stays
          </label>
          {stops.length ? (
            <select
              id="detach-location"
              value={locationId}
              onChange={(event) => setPicked(event.target.value)}
              disabled={detach.isPending}
              className="h-9 rounded-[2px] border border-slate-300 bg-white px-2 text-xs text-slate-900 focus-visible:border-amber-500 focus-visible:outline-none"
            >
              {stops.map((stop) => (
                <option key={stop.locationId} value={stop.locationId}>
                  {stop.locationName}
                  {stop.city ? `, ${stop.city}` : ""} ({stop.country})
                </option>
              ))}
            </select>
          ) : (
            <p className="m-0 text-xs text-red-700">No stop is available: the transport has no leg in transit or completed.</p>
          )}
        </div>

        <div className="grid gap-1">
          <label htmlFor="detach-note" className="font-heading text-[11px] font-medium tracking-[0.04em] text-slate-700 uppercase">
            Note (optional)
          </label>
          <Textarea
            id="detach-note"
            rows={3}
            value={note}
            maxLength={NOTE_MAX}
            onChange={(event) => setNote(event.target.value)}
            disabled={detach.isPending}
            placeholder="Veterinary facility, contact person, condition at handover"
            className="min-h-16 resize-y rounded-[2px] border-slate-300 bg-white px-3 py-2 text-xs leading-4 text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
          />
        </div>

        {error ? <IncidentErrorAlert error={error} onReload={() => { close(false); onReload() }} /> : null}

        <AlertDialogFooter className="gap-1.5 [&>button]:h-10 sm:[&>button]:h-8">
          <AlertDialogCancel size="sm" className="h-8 rounded-[2px] border-slate-300 bg-white px-3 text-xs font-normal text-slate-700 shadow-none" disabled={detach.isPending}>
            Keep travelling
          </AlertDialogCancel>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={detach.isPending || !locationId}
            className="inline-flex h-8 items-center justify-center rounded-[2px] bg-amber-600 px-3 text-xs font-normal text-white shadow-none transition-colors hover:bg-amber-700 disabled:pointer-events-none disabled:opacity-50"
          >
            {detach.isPending ? "Saving..." : "Leave horse here"}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
