import type { ReactNode } from "react";
import { Circle, FolderOpen, LockKeyhole } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { dossierDetail } from "@/app/route-config";
import { formatBookingDate } from "@/features/booking/utils";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { dossierStatusStyles } from "../constants";
import { useDossierRole } from "../hooks/useDossierRole";
import { formatDossierProgress } from "../lib/progress";
import type { DossierOverview as DossierOverviewData } from "../types";
import { DossierStatusBadge } from "./DossierStatusBadge";

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-[110px_minmax(0,1fr)] gap-2 text-xs leading-5">
      <dt className="text-gray-500">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-gray-900">
        {children}
      </dd>
    </div>
  );
}

const requirementMetrics = [
  { key: "total", label: "Total", status: null },
  { key: "satisfied", label: "Satisfied", status: "SATISFIED" },
  { key: "provided", label: "Provided", status: "PROVIDED" },
  { key: "pending", label: "Pending", status: "PENDING" },
  { key: "requested", label: "Requested", status: "REQUESTED" },
  { key: "rejected", label: "Rejected", status: "REJECTED" },
  { key: "waived", label: "Waived", status: "WAIVED" },
] as const;

export function DossierOverview({ dossier }: { dossier: DossierOverviewData }) {
  const navigate = useNavigate();
  const role = useDossierRole();
  const booking = dossier.bookingSummary;
  const milestones = [
    ["Ready for submission", dossier.readyForSubmissionAt],
    ["Approved", dossier.approvedAt],
    ["Rejected", dossier.rejectedAt],
    ["Closed", dossier.closedAt],
  ] as const;
  const meaningfulMilestones = milestones.filter(([, value]) => value != null);
  const proofs = [
    ["Quarantine proof", dossier.quarantineStatus],
    ["Customs clearance proof", dossier.customsClearanceStatus],
  ] as const;
  const hasProof = proofs.some(([, proof]) => proof != null);
  const progress = Math.max(0, Math.min(100, dossier.progressPercent));
  const siblings = dossier.complianceDossiers ?? [];
  const extraDossier = siblings.find((item) => item.dossierType === "EXTRA");
  const lockMessage =
    dossier.writeLockReason === "BOOKING_CHANGE_IN_PROGRESS"
      ? "Booking changes are in progress. Editing is temporarily locked."
      : dossier.writeLockReason === "DOSSIER_CLOSED" ||
          dossier.status === "CLOSED"
        ? "This dossier is closed. Changes are no longer allowed."
        : "Changes to this dossier are currently locked.";

  return (
    <div className="space-y-3">
      {extraDossier ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-950"
        >
          <div>
            <p className="m-0 font-semibold">
              Emergency return dossier EXTRA is active for this transport.
            </p>
            <p className="m-0 mt-1 text-xs text-orange-800">
              Review the EXTRA dossier before return-route activation. MAIN and
              EXTRA are separate compliance dossiers.
            </p>
          </div>
          {String(dossier.complianceDossierId) !==
          String(extraDossier.complianceDossierId) ? (
            <button
              type="button"
              onClick={() =>
                navigate(dossierDetail(extraDossier.complianceDossierId, role))
              }
              className="rounded-[2px] border border-orange-400 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-orange-900 hover:bg-orange-100 focus-visible:outline-2 focus-visible:outline-orange-700"
            >
              Open EXTRA dossier
            </button>
          ) : null}
        </div>
      ) : null}
      {dossier.writeLocked ? (
        <div
          role="status"
          className="flex items-start gap-2 border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <LockKeyhole aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {lockMessage}
        </div>
      ) : null}
      <Card className="booking-panel gap-0 rounded-[2px] border bg-white py-0">
        <CardContent className="grid gap-0 p-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)_minmax(0,1fr)]">
          <section className="min-w-0 p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <FolderOpen aria-hidden="true" className="size-5 text-primary" />
              <h2 className="m-0! font-heading text-base! font-bold! uppercase text-gray-900!">
                Dossier overview
              </h2>
            </div>
            <p className="mb-4 break-all font-heading text-xl font-bold text-gray-900">
              {dossier.dossierCode}
            </p>
            <dl className="space-y-2">
              {dossier.dossierType ? (
                <Detail label="Type">
                  <Badge
                    variant="outline"
                    className="rounded-[2px] font-heading text-[0.65rem] uppercase tracking-[0.06em]"
                  >
                    {dossier.dossierType}
                  </Badge>
                  {siblings.length > 1 ? (
                    <span
                      className="ml-2 inline-flex flex-wrap gap-1 align-middle"
                      role="group"
                      aria-label="Dossiers of this transport"
                    >
                      {siblings.map((item) => {
                        const current =
                          String(item.complianceDossierId) ===
                          String(dossier.complianceDossierId);
                        return (
                          <button
                            key={String(item.complianceDossierId)}
                            type="button"
                            aria-current={current ? "true" : undefined}
                            disabled={current}
                            onClick={() =>
                              navigate(
                                dossierDetail(item.complianceDossierId, role),
                              )
                            }
                            className="rounded-[2px] border border-slate-300 px-2 py-1 font-heading text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-slate-700 transition-colors hover:bg-amber-50 disabled:border-primary disabled:bg-amber-50 disabled:text-slate-900"
                          >
                            {item.dossierType ?? item.dossierCode}
                          </button>
                        );
                      })}
                    </span>
                  ) : null}
                </Detail>
              ) : null}
              {dossier.openedAt ? (
                <Detail label="Opened at">
                  {formatBookingDate(dossier.openedAt, true)} UTC
                </Detail>
              ) : null}
              <Detail label="Status">
                <DossierStatusBadge status={dossier.status} />
              </Detail>
            </dl>
          </section>
          <section className="@container min-w-0 border-t p-4 sm:p-5 lg:border-t-0 lg:border-l">
            <h2 className="m-0! font-heading text-base! font-bold! uppercase text-gray-900!">
              Overall progress
            </h2>
            <div className="mt-4 grid grid-cols-[minmax(0,0.6fr)_minmax(0,1fr)] items-center gap-3">
              <div className="flex w-full min-w-0 max-w-36 flex-col items-center gap-2 justify-self-center">
                <div
                  role="progressbar"
                  aria-label="Dossier requirements completed"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                  aria-valuetext={`${formatDossierProgress(dossier.progressPercent)}, ${dossier.mandatorySatisfiedOrWaived} of ${dossier.mandatoryTotal} mandatory requirements completed`}
                  className="relative aspect-square w-full max-w-32"
                >
                  <svg
                    viewBox="0 0 120 120"
                    fill="none"
                    aria-hidden="true"
                    className="size-full -rotate-90"
                  >
                    <circle
                      cx="60"
                      cy="60"
                      r="51"
                      stroke="currentColor"
                      strokeWidth="10"
                      className="text-slate-100"
                    />
                    {progress > 0 ? (
                      <circle
                        cx="60"
                        cy="60"
                        r="51"
                        pathLength="100"
                        stroke="currentColor"
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray="100"
                        strokeDashoffset={100 - progress}
                        className="text-primary"
                      />
                    ) : null}
                  </svg>
                  <div className="absolute inset-[16%] flex items-center justify-center rounded-full bg-slate-50/70">
                    <strong className="font-heading text-[clamp(1.25rem,7cqi,1.875rem)] leading-none text-primary tabular-nums">
                      {formatDossierProgress(dossier.progressPercent)}
                    </strong>
                  </div>
                </div>
                <p className="m-0 text-center text-xs leading-5 text-slate-500">
                  <span className="font-semibold text-slate-800 tabular-nums">
                    {dossier.mandatorySatisfiedOrWaived} /{" "}
                    {dossier.mandatoryTotal}
                  </span>{" "}
                  mandatory completed
                </p>
              </div>
              <dl
                aria-label="Requirement status counts"
                className="grid min-w-0 grid-cols-2 gap-x-2 gap-y-2 @[22rem]:gap-x-4"
              >
                {requirementMetrics.map(({ key, label, status }) => (
                  <div
                    key={key}
                    className={`flex min-w-0 items-center justify-between gap-1 ${status ? "py-0.5" : "col-span-2 mb-1 border-b border-slate-100 pb-2"}`}
                  >
                    <dt className="flex min-w-0 items-center gap-1 text-[11px] text-slate-600 @[22rem]:text-xs">
                      {status ? (
                        <span
                          aria-hidden="true"
                          className={`flex size-2.5 shrink-0 items-center justify-center rounded-full ${dossierStatusStyles[status]}`}
                        >
                          <Circle className="size-1 fill-current" />
                        </span>
                      ) : null}
                      <span className="[overflow-wrap:anywhere]">{label}</span>
                    </dt>
                    <dd
                      className={`m-0 shrink-0 font-semibold text-slate-900 tabular-nums ${status ? "text-sm" : "text-xl"}`}
                    >
                      {dossier.requirementSummary[key]}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
          <section className="min-w-0 border-t p-4 sm:p-5 lg:border-t-0 lg:border-l">
            <h2 className="m-0! font-heading text-base! font-bold! uppercase text-gray-900!">
              Booking information
            </h2>
            <dl className="mt-4 space-y-2">
              <Detail label="Booking">{dossier.bookingCode}</Detail>
              {booking.bookingStatus ? (
                <Detail label="Status">
                  {booking.bookingStatus === "CANCELLED" ? (
                    <Badge
                      variant="outline"
                      className="inline-flex h-5 items-center gap-1 rounded-full border-slate-300 bg-slate-100 px-1.5 py-0 text-[0.65rem] font-medium leading-none text-slate-600"
                    >
                      <Circle
                        aria-hidden="true"
                        className="size-1! fill-current"
                      />{" "}
                      Cancelled
                    </Badge>
                  ) : (
                    <DossierStatusBadge status={booking.bookingStatus} />
                  )}
                </Detail>
              ) : null}
              {booking.originCountry && booking.destinationCountry ? (
                <Detail label="Route">
                  {booking.originCountry} → {booking.destinationCountry}
                </Detail>
              ) : null}
              {booking.requestedDepartureDate ? (
                <Detail label="Departure">
                  {formatBookingDate(booking.requestedDepartureDate)}
                </Detail>
              ) : null}
              {booking.customerName ? (
                <Detail label="Customer">{booking.customerName}</Detail>
              ) : null}
              <Detail label="Horses">{booking.horseCount}</Detail>
            </dl>
          </section>
        </CardContent>
      </Card>
      {meaningfulMilestones.length ||
      dossier.rejectionReason ||
      dossier.note ||
      hasProof ? (
        <Card className="booking-panel gap-0 rounded-[2px] border bg-white py-0">
          <CardContent className="p-4 sm:p-5">
            <h2 className="m-0! font-heading text-base! font-bold! uppercase text-gray-900!">
              Additional dossier information
            </h2>
            <dl className="mt-3 grid gap-x-6 gap-y-2 md:grid-cols-2">
              {meaningfulMilestones.map(([label, value]) => (
                <Detail key={label} label={label}>
                  {formatBookingDate(value!, true)} UTC
                </Detail>
              ))}
              {dossier.rejectionReason ? (
                <Detail label="Rejection reason">
                  {dossier.rejectionReason}
                </Detail>
              ) : null}
              {dossier.note ? (
                <Detail label="Note">{dossier.note}</Detail>
              ) : null}
              {proofs.map(([label, proof]) =>
                proof ? (
                  <Detail key={label} label={label}>
                    {proof.status
                      .toLowerCase()
                      .replaceAll("_", " ")
                      .replace(/^./, (letter) => letter.toUpperCase())}
                    {proof.verifiedAt ? (
                      <span className="block text-gray-500">
                        Verified {formatBookingDate(proof.verifiedAt, true)} UTC
                      </span>
                    ) : null}
                  </Detail>
                ) : null,
              )}
            </dl>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
