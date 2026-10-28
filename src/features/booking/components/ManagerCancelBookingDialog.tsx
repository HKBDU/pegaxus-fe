import { zodResolver } from "@hookform/resolvers/zod"
import { TriangleAlert } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { getBookingErrorMessage } from "@/features/booking/utils"
import type { EntityId } from "@/shared/types"

import { useBookingRequestGuard, useManagerCancelBooking } from "@/features/booking/hooks"
import { managerCancelBookingSchema, type ManagerCancelBookingFormValues } from "@/features/booking/schemas"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form"
import { Textarea } from "@/shared/components/ui/textarea"

const REASON_MAX_LENGTH = 2000

interface ManagerCancelBookingDialogProps {
  bookingId?: EntityId
  bookingCode?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Logistics Manager cancels an APPROVED booking (U-10): the BE closes what hangs off it, and money already paid is not refunded. */
export function ManagerCancelBookingDialog({ bookingId, bookingCode, open, onOpenChange }: ManagerCancelBookingDialogProps) {
  const cancelBooking = useManagerCancelBooking()
  const requestGuard = useBookingRequestGuard()
  const form = useForm<ManagerCancelBookingFormValues>({
    resolver: zodResolver(managerCancelBookingSchema),
    defaultValues: { reason: "" },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    if (!bookingId) return
    try {
      const guarded = await requestGuard.run(() => cancelBooking.mutateAsync({ bookingId, reason: values.reason }))
      if (!guarded.started) return
      toast.success("Booking cancelled")
      form.reset()
      onOpenChange(false)
    } catch (error) {
      toast.error(getBookingErrorMessage(error, "Unable to cancel this booking"))
      // The transport left or the booking already changed: nothing more to do here, the page now shows the real state.
      const code = error instanceof Error ? error.message : ""
      if (code === "TRANSPORT_ALREADY_DEPARTED" || code === "INVALID_BOOKING_STATUS") onOpenChange(false)
    }
  })

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset()
      requestGuard.reset()
    }
    onOpenChange(nextOpen)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="gap-3 rounded-[2px] border-slate-200 bg-white p-4 text-slate-900 shadow-[0_14px_35px_rgba(15,23,42,0.16)] data-[size=default]:sm:max-w-[430px]">
        <AlertDialogHeader className="grid grid-rows-none grid-cols-[28px_minmax(0,1fr)] place-items-start gap-2.5 text-left">
          <AlertDialogMedia className="m-0 grid size-7 shrink-0 place-items-center rounded-[2px] bg-red-50 text-red-600">
            <TriangleAlert className="size-3.5" />
          </AlertDialogMedia>
          <div className="grid gap-0.5">
            <AlertDialogTitle className="m-0! font-heading text-base! leading-5! font-semibold! tracking-normal! text-slate-900">
              Cancel booking{bookingCode ? ` ${bookingCode}` : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-4 text-slate-600">
              This will close the transport plan, route plans, dossier, pending handovers and unpaid invoices. Vehicles on unused plans will be released.
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <p role="note" className="m-0 flex items-start gap-1.5 rounded-[2px] border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs leading-4 text-amber-900">
          <TriangleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
          Payments already made are NOT refunded.
        </p>
        <Form {...form}>
          <form id="manager-cancel-booking-form" onSubmit={onSubmit}>
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem className="gap-1">
                  <FormLabel className="font-heading text-[11px] font-medium tracking-[0.04em] text-slate-700 uppercase">
                    Reason <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      disabled={cancelBooking.isPending}
                      onChange={(event) => {
                        field.onChange(event)
                        requestGuard.reset()
                      }}
                      rows={3}
                      maxLength={REASON_MAX_LENGTH}
                      className="field-sizing-content h-auto min-h-16 max-h-32 resize-none overflow-y-auto rounded-[2px] border-slate-300 bg-white px-3 py-2 text-xs leading-4 text-slate-900 shadow-none placeholder:text-slate-400"
                      placeholder="Explain why this booking is being cancelled"
                    />
                  </FormControl>
                  <div className="flex items-start justify-between gap-2">
                    <FormMessage />
                    <span className="ml-auto text-[11px] leading-4 text-slate-400">{field.value.length}/{REASON_MAX_LENGTH}</span>
                  </div>
                </FormItem>
              )}
            />
          </form>
        </Form>
        <AlertDialogFooter className="gap-1.5">
          <AlertDialogCancel size="sm" className="h-8 rounded-[2px] border-slate-300 bg-white px-3 text-xs font-normal text-slate-700 shadow-none" disabled={cancelBooking.isPending}>
            Back
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            size="sm"
            className="h-8 rounded-[2px] bg-red-600 px-3 text-xs font-normal text-white shadow-none hover:bg-red-700"
            disabled={cancelBooking.isPending || requestGuard.isBlocked}
            onClick={(event) => {
              event.preventDefault()
              void onSubmit()
            }}
          >
            {cancelBooking.isPending ? "Cancelling..." : requestGuard.isBlocked ? "Please wait..." : "Cancel booking"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
