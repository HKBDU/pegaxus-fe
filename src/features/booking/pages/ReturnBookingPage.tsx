import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowRight, MapPin } from "lucide-react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import { bookingKeys } from "@/features/booking/hooks/useBookings"
import { bookingService } from "@/features/booking/services"
import { getBookingErrorMessage } from "@/features/booking/utils"
import { ErrorState, LoadingState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import { Textarea } from "@/shared/components/ui/textarea"

const today = () => new Date().toISOString().slice(0, 10)

/**
 * Return booking of a horse that was left behind mid-trip (opened from the customer's notification). Origin, destination and
 * horse come from the original trip and are fixed; the customer only picks the dates. The usual lead time does not apply.
 */
export default function ReturnBookingPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const returnOfTransportId = params.get("returnOfTransportId") ?? ""
  const horseId = params.get("horseId") ?? ""
  const [departure, setDeparture] = useState(today())
  const [arrival, setArrival] = useState("")
  const [note, setNote] = useState("")

  const draft = useQuery({
    queryKey: ["bookings", "return-draft", returnOfTransportId, horseId],
    queryFn: ({ signal }) => bookingService.getReturnDraft(returnOfTransportId, horseId, { signal }),
    enabled: Boolean(returnOfTransportId && horseId),
    retry: false,
  })

  const create = useMutation({
    mutationFn: () => {
      const value = draft.data!
      return bookingService.createReturnBooking({
        returnOfTransportId,
        originAddress: value.originAddress,
        originCountry: value.originCountry,
        originLatitude: value.originLatitude,
        originLongitude: value.originLongitude,
        destinationAddress: value.destinationAddress,
        destinationCountry: value.destinationCountry,
        destinationLatitude: value.destinationLatitude,
        destinationLongitude: value.destinationLongitude,
        requestedDepartureDate: departure,
        requestedArrivalDate: arrival || undefined,
        horses: [{ horseId: value.horseId }],
        customerNote: note.trim() || `Return trip of ${value.horseName} from transport ${value.transportCode} (booking ${value.bookingCode}).`,
      })
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: bookingKeys.lists() })
      toast.success(`Return booking ${result.bookingCode} created. Our team will review it.`)
      navigate(`/bookings/${result.bookingId}`)
    },
    onError: (error) => toast.error(getBookingErrorMessage(error, "Unable to create the return booking")),
  })

  if (!returnOfTransportId || !horseId) return <ErrorState message="This link is incomplete. Open it again from your notification." />
  if (draft.isPending) return <LoadingState />
  if (draft.isError || !draft.data)
    return <ErrorState message={getBookingErrorMessage(draft.error, "Unable to load the return booking.")} onRetry={() => void draft.refetch()} />

  const value = draft.data
  const invalidDates = !departure || departure < today() || (arrival !== "" && arrival < departure)

  return (
    <div className="booking-page-shell min-h-[70dvh] bg-[#f4f2ed] px-4 pt-5 pb-8 font-sans sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-[760px] space-y-3">
        <PageHeader title="RETURN BOOKING" backHref="/bookings" backLabel="BACK TO BOOKINGS" />

        <section className="border border-amber-300 bg-amber-50 p-3.5 text-sm text-amber-900">
          <p className="m-0 font-semibold">{value.horseName} could not continue transport {value.transportCode}.</p>
          <p className="m-0 mt-1 text-xs leading-5">
            The horse is in the care of a local veterinary facility. This booking brings it back to the starting point of booking {value.bookingCode}.
          </p>
        </section>

        {value.existingReturnBookingId ? (
          <section className="border border-slate-300 bg-white p-3.5 text-sm">
            A return booking already exists for this horse.{" "}
            <Link to={`/bookings/${value.existingReturnBookingId}`} className="font-semibold text-amber-700 underline">Open it</Link>
          </section>
        ) : (
          <section className="space-y-3.5 border border-[#e5e2d9] bg-white p-4">
            <div className="grid items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
              <div className="border border-slate-200 bg-[#faf9f6] p-2.5">
                <p className="m-0 flex items-center gap-1 text-[11px] font-medium tracking-[0.04em] text-slate-500 uppercase"><MapPin className="size-3" />From (where the horse stays)</p>
                <p className="m-0 mt-1 text-sm font-semibold text-slate-900">{value.originAddress || "—"}</p>
                <p className="m-0 text-xs text-slate-500">{value.originCountry}</p>
              </div>
              <ArrowRight className="mx-auto size-4 text-slate-400" aria-hidden="true" />
              <div className="border border-slate-200 bg-[#faf9f6] p-2.5">
                <p className="m-0 flex items-center gap-1 text-[11px] font-medium tracking-[0.04em] text-slate-500 uppercase"><MapPin className="size-3" />To (original starting point)</p>
                <p className="m-0 mt-1 text-sm font-semibold text-slate-900">{value.destinationAddress}</p>
                <p className="m-0 text-xs text-slate-500">{value.destinationCountry}</p>
              </div>
            </div>

            <p className="m-0 text-sm"><span className="text-slate-500">Horse:</span> <span className="font-semibold text-slate-900">{value.horseName}</span></p>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-[11px] font-medium tracking-[0.04em] text-slate-700 uppercase">
                Departure date
                <input type="date" min={today()} value={departure} onChange={(event) => setDeparture(event.target.value)}
                  className="h-9 rounded-[2px] border border-slate-300 px-2 text-sm font-normal tracking-normal text-slate-900 normal-case" />
              </label>
              <label className="grid gap-1 text-[11px] font-medium tracking-[0.04em] text-slate-700 uppercase">
                Arrival date (optional)
                <input type="date" min={departure || today()} value={arrival} onChange={(event) => setArrival(event.target.value)}
                  className="h-9 rounded-[2px] border border-slate-300 px-2 text-sm font-normal tracking-normal text-slate-900 normal-case" />
              </label>
            </div>

            <label className="grid gap-1 text-[11px] font-medium tracking-[0.04em] text-slate-700 uppercase">
              Note (optional)
              <Textarea rows={3} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)}
                placeholder="Anything our team should know about the pickup"
                className="min-h-16 rounded-[2px] border-slate-300 text-sm font-normal tracking-normal normal-case" />
            </label>

            <div className="flex justify-end">
              <button type="button" disabled={invalidDates || create.isPending} onClick={() => create.mutate()}
                className="inline-flex h-9 items-center justify-center rounded-[2px] bg-[#f39200] px-4 text-sm font-semibold text-[#181818] hover:bg-[#e08600] disabled:pointer-events-none disabled:opacity-50">
                {create.isPending ? "Creating..." : "Create return booking"}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
