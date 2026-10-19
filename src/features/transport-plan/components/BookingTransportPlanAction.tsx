import { useState } from "react";
import { useIsMutating } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { canAccess } from "@/features/auth/access-control";
import { useAuthStore } from "@/features/auth/store";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  getBookingTransportPlanAction,
  managerBookingDetailPath,
} from "../approved-booking-actions";
import { useApprovedBooking } from "../hooks/useApprovedBookings";
import { actionEntityIdSchema } from "../schemas";
import { getApprovedBookingError } from "../services";
import type { ApprovedBookingDetail, TransportPlanDetail } from "../types";
import { Field, Section } from "./ApprovedBookingDetails";
import { TransportPlanMetadataForm } from "./TransportPlanMetadataForm";

export type BookingTransportPlanActionProps = {
  bookingId: string;
  status: string;
  onCreated?: (plan: TransportPlanDetail) => void;
};

export function BookingTransportPlanAction({
  bookingId,
  status,
  onCreated,
}: BookingTransportPlanActionProps) {
  const principal = useAuthStore((state) => state.principal);
  const allowed =
    canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] }) &&
    status === "APPROVED" &&
    actionEntityIdSchema.safeParse(bookingId).success;
  const query = useApprovedBooking(bookingId, allowed);
  const [open, setOpen] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const pending =
    useIsMutating({ mutationKey: ["transport-plans", "create", bookingId] }) >
    0;
  if (!allowed) return null;
  if (query.isPending)
    return (
      <Button
        disabled
        size="sm"
        className="h-8 rounded-[2px] font-heading text-[11px] uppercase"
      >
        Loading Transport Plan...
      </Button>
    );
  if (query.isError) {
    const error = getApprovedBookingError(query.error);
    return (
      <div role="alert" className="space-y-1 text-xs text-red-700">
        <p>{error.message}</p>
        {error.retryable && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
          >
            Retry
          </Button>
        )}
      </div>
    );
  }
  const booking = query.data;
  if (!booking || booking.bookingId !== bookingId) return null;
  const action = getBookingTransportPlanAction(principal, booking);
  if (!action) return null;
  return (
    <>
      {action.href ? (
        <div className="space-y-1">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 rounded-[2px] bg-white font-heading text-[11px] uppercase"
          >
            <Link to={action.href}>{action.label}</Link>
          </Button>
          {duplicate && (
            <p role="status" className="text-xs text-slate-500">
              A transport plan already exists. Open it to continue.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <Button
            type="button"
            size="sm"
            className="flow3-ui h-8 rounded-[2px] font-heading text-[11px] uppercase"
            disabled={Boolean(action.blockedReason)}
            onClick={() => setOpen(true)}
          >
            {action.label}
          </Button>
          {action.blockedReason && (
            <p className="max-w-xs text-xs text-slate-500">
              {action.blockedReason}
            </p>
          )}
        </div>
      )}
      <Dialog
        open={open && action.kind === "createTransportPlan"}
        onOpenChange={(next) => {
          if (!pending) setOpen(next);
        }}
      >
        <DialogContent
          className="flow3-ui max-h-[85svh] overflow-y-auto rounded-[2px] border-slate-200 p-3 shadow-lg motion-reduce:animate-none sm:max-w-3xl sm:p-4"
          onEscapeKeyDown={(event) => {
            if (pending) event.preventDefault();
          }}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="border-b border-slate-200 pb-3 pr-6 text-left">
            <DialogTitle className="m-0! font-heading text-xl! leading-6! uppercase">
              Create Transport Plan
            </DialogTitle>
            <DialogDescription>
              Plan this approved booking using its existing transport.
            </DialogDescription>
          </DialogHeader>
          <CreateTransportPlanContent
            booking={booking}
            onCancel={() => setOpen(false)}
            onCreated={(plan) => {
              setOpen(false);
              onCreated?.(plan);
            }}
            onDuplicate={async () => {
              setDuplicate(true);
              await query.refetch();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CreateTransportPlanContent({
  booking,
  onCancel,
  onCreated,
  onDuplicate,
}: {
  booking: ApprovedBookingDetail;
  onCancel?: () => void;
  onCreated?: (plan: TransportPlanDetail) => void;
  onDuplicate?: () => Promise<unknown>;
}) {
  return (
    <div className="space-y-4">
      <Section title="Booking Summary">
        <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Booking">{booking.bookingCode}</Field>
          <Field label="Customer">{booking.customer.fullName}</Field>
          <Field label="Horses">{String(booking.totalHorses)}</Field>
          <Field label="Origin">
            {booking.originAddress} ({booking.originCountry})
          </Field>
          <Field label="Destination">
            {booking.destinationAddress} ({booking.destinationCountry})
          </Field>
          <Field label="Requested dates">
            {booking.requestedDepartureDate} →{" "}
            {booking.requestedArrivalDate ?? "—"}
          </Field>
          <Field label="Origin coordinates">
            {booking.originLatitude != null && booking.originLongitude != null
              ? `${booking.originLatitude}, ${booking.originLongitude}`
              : null}
          </Field>
          <Field label="Destination coordinates">
            {booking.destinationLatitude != null &&
            booking.destinationLongitude != null
              ? `${booking.destinationLatitude}, ${booking.destinationLongitude}`
              : null}
          </Field>
        </dl>
      </Section>
      <TransportPlanMetadataForm
        bookingId={booking.bookingId}
        cancelHref={managerBookingDetailPath(booking.bookingId)}
        onCancel={onCancel}
        onCreated={onCreated}
        onDuplicate={onDuplicate}
      />
    </div>
  );
}
