import { useState } from "react"
import { ArrowRight, MapPin } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { assertBookingEditSession, releaseEditLock, type BookingEditSession } from "@/features/booking/editLock"
import { useUpdateBooking } from "@/features/booking/hooks"
import type { Booking, BookingFormValues } from "@/features/booking/types"
import { getBookingErrorMessage } from "@/features/booking/utils"
import { PageHeader } from "@/shared/components/PageHeader"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { Textarea } from "@/shared/components/ui/textarea"

const today = () => new Date().toISOString().slice(0, 10)

/**
 * Edit form of a return booking. The pickup stop, the destination and the horse come from the original trip and stay fixed;
 * the customer changes only the dates and the note. A return booking has no lead time, so any date from today is allowed.
 */
export function ReturnBookingEditForm({ booking, session, onSaveFailed }: {
  booking: Booking
  session: BookingEditSession
  onSaveFailed: () => Promise<void>
}) {
  const navigate = useNavigate()
  const updateBooking = useUpdateBooking()
  const [departure, setDeparture] = useState(booking.requestedDepartureDate)
  const [arrival, setArrival] = useState(booking.requestedArrivalDate ?? "")
  const [note, setNote] = useState(booking.customerNote ?? "")
  const [leaving, setLeaving] = useState(false)
  const exitPath = `/bookings/${booking.bookingId}`
  const invalidDates = !departure || departure < today() || (arrival !== "" && arrival < departure)
  const busy = updateBooking.isPending || leaving

  const save = async () => {
    // Everything but the dates and the note is sent back as it is on the server.
    const values: BookingFormValues = {
      originAddress: booking.originAddress,
      originCountry: booking.originCountry,
      originLatitude: booking.originLatitude ?? undefined,
      originLongitude: booking.originLongitude ?? undefined,
      destinationAddress: booking.destinationAddress,
      destinationCountry: booking.destinationCountry,
      destinationLatitude: booking.destinationLatitude ?? undefined,
      destinationLongitude: booking.destinationLongitude ?? undefined,
      requestedDepartureDate: departure,
      requestedArrivalDate: arrival,
      specialRequirements: booking.specialRequirements ?? "",
      customerNote: note.trim(),
      horses: booking.horses.map((horse) => ({ horseId: horse.horseId, specialHandlingNotes: horse.specialHandlingNotes ?? undefined })),
    }
    try {
      await updateBooking.mutateAsync({ booking, values, session })
      assertBookingEditSession(session)
      toast.success("Return booking updated")
      navigate(exitPath, { replace: true })
    } catch (error) {
      if (session.controller.signal.aborted) return
      toast.error(getBookingErrorMessage(error, "Unable to update this return booking"))
      if (!(error instanceof Error && error.message === "BOOKING_MODIFIED")) await onSaveFailed().catch(() => undefined)
    }
  }

  const cancel = async () => {
    setLeaving(true)
    try {
      assertBookingEditSession(session)
      await releaseEditLock(booking.bookingId, session)
      navigate(exitPath)
    } catch (error) {
      if (!session.controller.signal.aborted) toast.error(getBookingErrorMessage(error, "Unable to leave this booking"))
      setLeaving(false)
    }
  }

  const horse = booking.returnOf?.horse?.horseName ?? booking.horses[0]?.horseName

  return (
    <div className="booking-page-shell min-h-[70dvh] bg-[#f4f2ed] px-4 pt-5 pb-8 font-sans sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-[760px] space-y-3">
        <PageHeader title="EDIT RETURN BOOKING" backHref={exitPath} backLabel="BACK TO BOOKING" />

        <section className="border border-amber-300 bg-amber-50 p-3.5 text-sm text-amber-900">
          <p className="m-0 font-semibold">Return trip of {horse ?? "a horse"} left behind by transport {booking.returnOf?.transportCode}.</p>
          <p className="m-0 mt-1 text-xs leading-5">
            The pickup stop, the destination and the horse stay as they are. You can change the dates and the note.
          </p>
        </section>

        <section className="space-y-3.5 border border-[#e5e2d9] bg-white p-4">
          <div className="grid items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
            <div className="border border-slate-200 bg-[#faf9f6] p-2.5">
              <p className="m-0 flex items-center gap-1 text-[11px] font-medium tracking-[0.04em] text-slate-500 uppercase"><MapPin className="size-3" />From (where the horse stays)</p>
              <p className="m-0 mt-1 text-sm font-semibold text-slate-900">{booking.originAddress || "—"}</p>
              <p className="m-0 text-xs text-slate-500">{booking.originCountry}</p>
            </div>
            <ArrowRight className="mx-auto size-4 text-slate-400" aria-hidden="true" />
            <div className="border border-slate-200 bg-[#faf9f6] p-2.5">
              <p className="m-0 flex items-center gap-1 text-[11px] font-medium tracking-[0.04em] text-slate-500 uppercase"><MapPin className="size-3" />To (original starting point)</p>
              <p className="m-0 mt-1 text-sm font-semibold text-slate-900">{booking.destinationAddress}</p>
              <p className="m-0 text-xs text-slate-500">{booking.destinationCountry}</p>
            </div>
          </div>

          <p className="m-0 text-sm"><span className="text-slate-500">Horse:</span> <span className="font-semibold text-slate-900">{horse ?? "—"}</span></p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1 text-[11px] font-medium tracking-[0.04em] text-slate-700 uppercase">
              <span>Departure date</span>
              <DatePicker minDate={today()} value={departure} onChange={setDeparture} placeholder="DD / MM / YYYY" className="h-9 rounded-[2px]" />
            </div>
            <div className="grid gap-1 text-[11px] font-medium tracking-[0.04em] text-slate-700 uppercase">
              <span>Arrival date (optional)</span>
              <DatePicker minDate={departure || today()} value={arrival} onChange={setArrival} placeholder="DD / MM / YYYY" className="h-9 rounded-[2px]" />
            </div>
          </div>
          {departure && departure < today() ? (
            <p role="alert" className="m-0 text-xs text-red-600">The departure date cannot be in the past.</p>
          ) : null}
          {arrival && departure && arrival < departure ? (
            <p role="alert" className="m-0 text-xs text-red-600">The arrival date cannot be before the departure date.</p>
          ) : null}

          <label className="grid gap-1 text-[11px] font-medium tracking-[0.04em] text-slate-700 uppercase">
            Note (optional)
            <Textarea rows={3} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)}
              placeholder="Anything our team should know about the pickup"
              className="min-h-16 rounded-[2px] border-slate-300 text-sm font-normal tracking-normal normal-case" />
          </label>

          <div className="flex justify-end gap-2">
            <button type="button" disabled={busy} onClick={() => void cancel()}
              className="inline-flex h-9 items-center justify-center rounded-[2px] border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50">
              Cancel
            </button>
            <button type="button" disabled={invalidDates || busy} onClick={() => void save()}
              className="inline-flex h-9 items-center justify-center rounded-[2px] bg-[#f39200] px-4 text-sm font-semibold text-[#181818] hover:bg-[#e08600] disabled:pointer-events-none disabled:opacity-50">
              {updateBooking.isPending ? "Saving..." : "Save and resubmit"}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
