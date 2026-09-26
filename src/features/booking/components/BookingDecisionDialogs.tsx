import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { getBookingErrorMessage } from "@/features/booking/utils"
import type { EntityId } from "@/shared/types"

import { useApproveBooking, useRejectBooking } from "@/features/booking/hooks"
import { rejectBookingSchema, type RejectBookingFormValues } from "@/features/booking/schemas"
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

interface BookingDialogProps {
  bookingId: EntityId
  bookingCode: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ApproveBookingDialog({ bookingId, bookingCode, open, onOpenChange }: BookingDialogProps) {
  const approveBooking = useApproveBooking()

  const approve = async () => {
    try {
      const result = await approveBooking.mutateAsync(bookingId)
      toast.success(`${bookingCode} approved. Transport ${result.transport.transportCode} created.`)
      onOpenChange(false)
    } catch (error) {
      toast.error(getBookingErrorMessage(error, "Unable to approve this booking"))
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-[2px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Approve {bookingCode}?</AlertDialogTitle>
          <AlertDialogDescription>Approval creates a new transport and notifies the customer. This action is only valid while the booking is pending.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-[2px]">Keep pending</AlertDialogCancel>
          <AlertDialogAction className="rounded-[2px] bg-emerald-600 text-white hover:bg-emerald-700" disabled={approveBooking.isPending} onClick={() => void approve()}>
            {approveBooking.isPending ? "Approving..." : "Approve booking"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function RejectBookingDialog({ bookingId, bookingCode, open, onOpenChange }: BookingDialogProps) {
  const rejectBooking = useRejectBooking()
  const form = useForm<RejectBookingFormValues>({ resolver: zodResolver(rejectBookingSchema), defaultValues: { reason: "" } })

  const submit = form.handleSubmit(async ({ reason }) => {
    try {
      await rejectBooking.mutateAsync({ bookingId, reason })
      toast.success(`${bookingCode} rejected`)
      form.reset()
      onOpenChange(false)
    } catch (error) {
      toast.error(getBookingErrorMessage(error, "Unable to reject this booking"))
    }
  })

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-[2px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Reject {bookingCode}?</AlertDialogTitle>
          <AlertDialogDescription>The customer will receive this reason with the rejection notification.</AlertDialogDescription>
        </AlertDialogHeader>
        <Form {...form}>
          <form id="reject-booking-form" onSubmit={submit}>
            <FormField control={form.control} name="reason" render={({ field }) => <FormItem><FormLabel>Rejection reason</FormLabel><FormControl><Textarea {...field} className="min-h-28 rounded-[2px] border-slate-300" placeholder="Explain why this request cannot be accepted" /></FormControl><FormMessage /></FormItem>} />
          </form>
        </Form>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-[2px]">Keep pending</AlertDialogCancel>
          {/* Radix closes the dialog (and unmounts the form) on click, so the form must be submitted from onClick, like CancelBookingDialog. */}
          <AlertDialogAction
            type="button"
            variant="destructive"
            className="rounded-[2px] bg-red-600 text-white hover:bg-red-700"
            disabled={rejectBooking.isPending}
            onClick={(event) => {
              event.preventDefault()
              void submit()
            }}
          >
            {rejectBooking.isPending ? "Rejecting..." : "Reject booking"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
