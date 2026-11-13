import { zodResolver } from "@hookform/resolvers/zod"
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
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form"
import { Textarea } from "@/shared/components/ui/textarea"

interface ManagerCancelBookingDialogProps {
  bookingId?: EntityId
  bookingCode?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Logistics Manager cancels an APPROVED booking (U-10): the BE closes what hangs off it, and money already paid is not refunded. */
export function ManagerCancelBookingDialog({ bookingId, open, onOpenChange }: ManagerCancelBookingDialogProps) {
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
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel booking?</AlertDialogTitle>
          <AlertDialogDescription>
            This updates the booking status immediately. Add a reason for the operations team.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Form {...form}>
          <form id="cancel-booking-form" onSubmit={onSubmit}>
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem className="gap-1">
                  <FormLabel className="font-heading text-[11px] font-medium tracking-[0.04em] text-slate-700 uppercase">
                    Cancellation reason
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      disabled={cancelBooking.isPending}
                      onChange={(event) => {
                        field.onChange(event)
                        requestGuard.reset()
                      }}
                      rows={2}
                      maxLength={500}
                      className="field-sizing-content h-auto min-h-14 max-h-24 resize-none overflow-y-auto rounded-[2px] border-slate-300 bg-white px-3 py-2 text-xs leading-4 text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
                      placeholder="Explain why this booking is being cancelled"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancelBooking.isPending}>Keep booking</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            className="bg-[#f39200] text-slate-950 hover:bg-[#d98200]"
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
