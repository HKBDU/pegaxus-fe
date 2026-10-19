import { useId, type ReactNode } from "react";
import {
  CircleCheck,
  Clock3,
  FileCheck2,
  HeartPulse,
  Phone,
  Truck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import { formatTransportLabel } from "../format";
import { routeLabels } from "../constants";
import type { TransportOverview } from "../types";

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-start gap-3 text-xs">
      <dt className="text-slate-500">{label}</dt>
      <dd className="m-0 min-w-0 text-right font-medium break-words text-slate-800">
        {children}
      </dd>
    </div>
  );
}

export function TransportJourneyInformation({
  overview,
}: {
  overview: TransportOverview;
}) {
  return (
    <section
      className="overview-panel overview-cell"
      aria-labelledby="journey-information"
    >
      <h2 id="journey-information" className="overview-heading">
        <UserRound aria-hidden="true" />
        Journey information
      </h2>
      <dl className="mt-3 mb-0 space-y-2">
        <InfoRow label="Booking code">{overview.booking.bookingCode}</InfoRow>
        <InfoRow label="Customer">{overview.booking.customerName}</InfoRow>
        <InfoRow label="Origin">
          {overview.booking.originAddress}
          <span className="mt-1 block text-[11px] font-normal text-slate-500">
            {overview.booking.originCountry}
          </span>
        </InfoRow>
        <InfoRow label="Destination">
          {overview.booking.destinationAddress}
          <span className="mt-1 block text-[11px] font-normal text-slate-500">
            {overview.booking.destinationCountry}
          </span>
        </InfoRow>
        <InfoRow label="Total legs">{overview.totalSegments}</InfoRow>
        <InfoRow label="Horses">{overview.horseCount}</InfoRow>
        <InfoRow label="Route type">
          {overview.routeType
            ? routeLabels[overview.routeType]
            : "Not available"}
        </InfoRow>
      </dl>
    </section>
  );
}

export function TransportHorseHealthSummary({
  summary,
}: {
  summary: TransportOverview["horseHealthSummary"];
}) {
  const percentage =
    summary.total > 0
      ? Math.min(100, (summary.normal / summary.total) * 100)
      : 0;
  const categories = [
    {
      label: "Normal",
      value: summary.normal,
      color: "border-emerald-100 bg-emerald-50 text-emerald-800",
    },
    {
      label: "Observation required",
      value: summary.observationRequired,
      color: "border-amber-100 bg-amber-50 text-amber-800",
    },
    {
      label: "At risk",
      value: summary.atRisk,
      color: "border-orange-100 bg-orange-50 text-orange-800",
    },
    {
      label: "Critical",
      value: summary.critical,
      color: "border-rose-100 bg-rose-50 text-rose-800",
    },
    {
      label: "No data",
      value: summary.noData,
      color: "border-slate-200 bg-slate-50 text-slate-600",
    },
  ];
  return (
    <section
      className="overview-panel overview-cell"
      aria-labelledby="horse-health-summary"
    >
      <h2 id="horse-health-summary" className="overview-heading">
        <HeartPulse aria-hidden="true" />
        Horse health status
      </h2>
      <p className="mt-2 mb-2 text-sm font-semibold text-emerald-700">
        {summary.total === 0
          ? "No health summary data"
          : `${summary.normal} / ${summary.total} Normal`}
      </p>
      <Progress
        value={percentage}
        aria-label="Proportion of horses with normal health"
        className="h-1.5 bg-slate-100 [&_[data-slot=progress-indicator]]:bg-emerald-500"
      />
      <dl className="mt-3 mb-0 grid grid-cols-2 gap-1.5">
        {categories.map((category) => (
          <div
            key={category.label}
            className={`rounded-xs border px-2 py-2 text-center ${category.color}`}
          >
            <dd className="m-0 text-lg leading-none font-semibold tabular-nums">
              {category.value}
            </dd>
            <dt className="mt-1 text-[11px] leading-snug break-words">
              {category.label}
            </dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function TransportStaff({
  segment,
}: {
  segment: TransportOverview["currentSegment"];
}) {
  const headingId = useId();
  const staff = segment
    ? [
        { label: "Vehicle driver", person: segment.driver },
        { label: "Horse escort", person: segment.escort },
      ]
    : [];
  return (
    <section
      className="overview-panel overview-cell"
      aria-labelledby={headingId}
    >
      <h2 id={headingId} className="overview-heading">
        <UsersRound aria-hidden="true" />
        Current staff / Provider
      </h2>
      {!segment ? (
        <p className="mt-4 mb-0 text-xs text-slate-500">
          No current segment assignment available.
        </p>
      ) : segment.isOutsourced ? (
        <div className="mt-4 rounded-xs border border-slate-200 bg-slate-50 p-3">
          <span className="text-[11px] text-slate-500">
            Outsourced provider
          </span>
          <p className="mt-1 mb-3 text-sm font-semibold text-slate-900">
            {segment.provider?.providerName ??
              "Provider information unavailable"}
          </p>
          <dl className="mb-0 space-y-2">
            <InfoRow label="Service">
              {segment.provider?.serviceType ?? "Not available"}
            </InfoRow>
            <InfoRow label="Reference">
              {segment.provider?.providerReference ?? "Not available"}
            </InfoRow>
          </dl>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {staff.map(({ label, person }) => (
            <div
              key={label}
              className="flex gap-2 rounded-xs border border-slate-100 bg-slate-50 p-2.5"
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600"
                aria-hidden="true"
              >
                {person?.fullName
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("") || <UserRound className="size-4" />}
              </span>
              <div className="min-w-0">
                <span className="text-[11px] text-slate-500">{label}</span>
                <p className="mt-0.5 mb-0 text-sm font-semibold break-words text-slate-900">
                  {person?.fullName ?? "Not assigned"}
                </p>
                {person ? (
                  <>
                    <span className="block text-[11px] text-slate-500">
                      {person.employeeCode}
                    </span>
                    {person.phone ? (
                      <span className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                        <Phone aria-hidden="true" className="size-3" />
                        {person.phone}
                      </span>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
      {segment && segment.vehicles.length > 0 ? (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <span className="text-[11px] text-slate-500">Vehicles</span>
          <ul className="mt-1 mb-0 list-none space-y-1 p-0">
            {segment.vehicles.map((vehicle) => (
              <li
                key={vehicle.vehicleId}
                className="flex items-center gap-2 text-xs text-slate-700"
              >
                <Truck aria-hidden="true" className="size-3.5 shrink-0" />
                {vehicle.vehicleCode}
                {vehicle.licensePlate ? ` · ${vehicle.licensePlate}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {segment?.note ? (
        <p className="mt-3 mb-0 border-t border-slate-100 pt-3 text-xs leading-relaxed whitespace-pre-wrap text-slate-500">
          {segment.note}
        </p>
      ) : null}
    </section>
  );
}

export function TransportDossiers({
  dossiers,
}: {
  dossiers: TransportOverview["complianceDossiers"];
}) {
  const rank = { MAIN: 0, EXTRA: 1 };
  const ordered = [...dossiers].sort(
    (a, b) =>
      (a.dossierType ? rank[a.dossierType] : 2) -
      (b.dossierType ? rank[b.dossierType] : 2),
  );
  return (
    <section className="overview-panel" aria-labelledby="transport-dossiers">
      <div className="overview-cell">
        <h2 id="transport-dossiers" className="overview-heading">
          <FileCheck2 aria-hidden="true" />
          Legal dossiers
        </h2>
        {ordered.length === 0 ? (
          <p className="mt-3 mb-0 text-xs text-slate-500">Chưa có hồ sơ</p>
        ) : (
          <ul className="mt-3 mb-0 grid list-none gap-2 p-0 md:grid-cols-2">
            {ordered.map((dossier) => (
              <li
                key={dossier.complianceDossierId}
                className="flex flex-wrap items-center gap-2 rounded-xs border border-slate-200 px-3 py-2.5"
              >
                {dossier.dossierType ? (
                  <Badge variant="secondary" className="rounded-xs text-[10px]">
                    {dossier.dossierType === "EXTRA"
                      ? "Bổ sung (quay đầu)"
                      : "MAIN"}
                  </Badge>
                ) : null}
                <span className="min-w-0 flex-1 break-words text-xs font-semibold text-slate-800">
                  {dossier.dossierCode}
                </span>
                <Badge
                  variant="outline"
                  className={`rounded-xs text-[10px] ${dossier.status === "APPROVED" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : dossier.status === "REJECTED" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}
                >
                  {dossier.status === "APPROVED" ? (
                    <CircleCheck aria-hidden="true" />
                  ) : (
                    <Clock3 aria-hidden="true" />
                  )}
                  {formatTransportLabel(dossier.status)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
