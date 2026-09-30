import type { ReactNode } from "react";
import { FolderOpen, LockKeyhole } from "lucide-react";
import { formatBookingDate } from "@/features/booking/utils";
import { BookingStatusBadge } from "@/features/booking/components/BookingStatusBadge";
import type { Booking } from "@/features/booking/types";
import { Card, CardContent } from "@/shared/components/ui/card";
import type { DossierOverview as DossierOverviewData } from "../types";
import { DossierStatusBadge } from "./DossierStatusBadge";

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-[110px_minmax(0,1fr)] gap-2 text-xs leading-5">
      <dt className="text-gray-500">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-gray-900">{children}</dd>
    </div>
  );
}

type BookingInformation = Pick<Booking, "status" | "originCountry" | "destinationCountry" | "requestedDepartureDate" | "totalHorses" | "customer">;

export function DossierOverview({ dossier, booking, bookingLoading = false, bookingError = false }: {
  dossier: DossierOverviewData;
  booking?: BookingInformation;
  bookingLoading?: boolean;
  bookingError?: boolean;
}) {
  const milestones = [
    ["Ready for submission", dossier.readyForSubmissionAt],
    ["Approved", dossier.approvedAt],
    ["Rejected", dossier.rejectedAt],
    ["Closed", dossier.closedAt],
  ] as const;
  const meaningfulMilestones = milestones.filter(([, value]) => value !== null);
  const proofs = [
    ["Quarantine proof", dossier.quarantineStatus],
    ["Customs clearance proof", dossier.customsClearanceStatus],
  ] as const;
  const hasProof = proofs.some(([, proof]) => proof !== null);
  const progress = Math.max(0, Math.min(100, dossier.progressPercent));
  const lockMessage = dossier.writeLockReason === "BOOKING_CHANGE_IN_PROGRESS"
    ? "Booking changes are in progress. Editing is temporarily locked."
    : dossier.writeLockReason === "DOSSIER_CLOSED" || dossier.status === "CLOSED"
      ? "This dossier is closed. Changes are no longer allowed."
      : "Changes to this dossier are currently locked.";

  return (
    <div className="space-y-3">
      {dossier.writeLocked ? (
        <div role="status" className="flex items-start gap-2 border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <LockKeyhole aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{lockMessage}
        </div>
      ) : null}
      <Card className="booking-panel gap-0 rounded-[2px] border bg-white py-0">
        <CardContent className="grid gap-0 p-0 lg:grid-cols-[1fr_1.2fr_0.85fr]">
          <section className="min-w-0 p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <FolderOpen aria-hidden="true" className="size-5 text-primary" />
              <h2 className="m-0! font-heading text-base! font-bold! uppercase text-gray-900!">Dossier overview</h2>
            </div>
            <p className="mb-4 break-all font-heading text-xl font-bold text-gray-900">{dossier.dossierCode}</p>
            <dl className="space-y-2">
              <Detail label="Opened at">{formatBookingDate(dossier.openedAt, true)} UTC</Detail>
              <Detail label="Status"><DossierStatusBadge status={dossier.status} /></Detail>
            </dl>
          </section>
          <section className="min-w-0 border-t p-4 sm:p-5 lg:border-t-0 lg:border-l">
            <h2 className="m-0! font-heading text-base! font-bold! uppercase text-gray-900!">Overall progress</h2>
            <p className="mt-3 text-sm text-gray-600">{dossier.mandatorySatisfiedOrWaived} / {dossier.mandatoryTotal} mandatory completed</p>
            <div className="mt-3 flex items-center gap-4">
              <div role="progressbar" aria-label="Mandatory dossier requirements completed" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}
                className="h-3 min-w-0 flex-1 overflow-hidden rounded-[2px] bg-slate-200">
                <div className="h-full rounded-[2px] bg-primary" style={{ width: `${progress}%` }} />
              </div>
              <strong className="shrink-0 font-heading text-2xl text-primary">{dossier.progressPercent}%</strong>
            </div>
            <p className="mt-4 text-xs text-gray-500">Progress is based on mandatory requirements.</p>
          </section>
          <section className="min-w-0 border-t p-4 sm:p-5 lg:border-t-0 lg:border-l">
            <h2 className="m-0! font-heading text-base! font-bold! uppercase text-gray-900!">Booking information</h2>
            <dl className="mt-4 space-y-2">
              <Detail label="Booking">{dossier.bookingCode}</Detail>
              {booking ? (
                <>
                  <Detail label="Status"><BookingStatusBadge status={booking.status} audience="customer" /></Detail>
                  <Detail label="Route">{booking.originCountry} → {booking.destinationCountry}</Detail>
                  <Detail label="Departure">{formatBookingDate(booking.requestedDepartureDate)}</Detail>
                  <Detail label="Horses">{booking.totalHorses}</Detail>
                  <Detail label="Customer">{booking.customer.fullName}</Detail>
                </>
              ) : null}
            </dl>
            {bookingLoading ? <p className="mt-2 text-xs text-gray-500">Loading booking information…</p> : null}
            {bookingError ? <p className="mt-2 text-xs text-gray-500">Additional booking information is unavailable.</p> : null}
          </section>
        </CardContent>
      </Card>
      {meaningfulMilestones.length || dossier.rejectionReason || dossier.note || hasProof ? (
        <Card className="booking-panel gap-0 rounded-[2px] border bg-white py-0">
          <CardContent className="p-4 sm:p-5">
            <h2 className="m-0! font-heading text-base! font-bold! uppercase text-gray-900!">Additional dossier information</h2>
            <dl className="mt-3 grid gap-x-6 gap-y-2 md:grid-cols-2">
              {meaningfulMilestones.map(([label, value]) => (
                <Detail key={label} label={label}>{formatBookingDate(value!, true)} UTC</Detail>
              ))}
              {dossier.rejectionReason ? <Detail label="Rejection reason">{dossier.rejectionReason}</Detail> : null}
              {dossier.note ? <Detail label="Note">{dossier.note}</Detail> : null}
              {proofs.map(([label, proof]) => proof ? (
                <Detail key={label} label={label}>
                  {proof.status.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase())}
                  {proof.verifiedAt ? <span className="block text-gray-500">Verified {formatBookingDate(proof.verifiedAt, true)} UTC</span> : null}
                </Detail>
              ) : null)}
            </dl>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
