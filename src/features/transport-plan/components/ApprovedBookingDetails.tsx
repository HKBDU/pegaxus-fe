import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store";
import { canAccess } from "@/features/auth/access-control";
import { dossierDetail } from "@/app/route-config";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBookingDate } from "@/features/booking/utils";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { EmptyState } from "@/shared/components/common";
import type { ApprovedBookingDetail } from "../types";
import { ApprovedBookingBadge } from "./ApprovedBookingBadge";

export function DossierSummaries({
  dossiers,
}: {
  dossiers: ApprovedBookingDetail["complianceDossiers"];
}) {
  const principal = useAuthStore((state) => state.principal);
  const role = canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })
    ? "LOGISTICS_MANAGER"
    : canAccess(principal, { anyRole: ["TRANSPORT_SPECIALIST"] })
      ? "TRANSPORT_SPECIALIST"
      : null;
  return dossiers.length ? (
    <div className="flex flex-wrap gap-2">
      {dossiers.map((dossier) => (
        <div
          key={dossier.complianceDossierId}
          className="flex min-w-0 flex-wrap items-center gap-2 rounded-[2px] border border-slate-200 px-2 py-1.5 text-xs"
        >
          <span>{dossier.dossierType ?? "Type unavailable"}</span>
          {role ? (
            <Link
              to={dossierDetail(dossier.complianceDossierId, role)}
              className="break-all font-medium text-primary hover:underline"
            >
              {dossier.dossierCode || "View dossier"}
            </Link>
          ) : dossier.dossierCode ? (
            <span className="break-all">{dossier.dossierCode}</span>
          ) : null}
          <ApprovedBookingBadge value={dossier.status} />
        </div>
      ))}
    </div>
  ) : (
    <p className="text-xs text-slate-500">
      No compliance dossier has been prepared yet.
    </p>
  );
}

export function LocationReference({
  location,
}: {
  location: NonNullable<
    ApprovedBookingDetail["transportPlan"]
  >["originLocation"];
}) {
  return location ? (
    <span className="space-y-1">
      <span className="block">{location.locationName}</span>
      <span className="block text-xs text-slate-500">
        {[location.locationType, location.city, location.country]
          .filter(Boolean)
          .join(" · ")}
      </span>
      {location.latitude != null && location.longitude != null && (
        <span className="block text-xs text-slate-500">
          {location.latitude}, {location.longitude}
        </span>
      )}
    </span>
  ) : (
    <span>Not assigned</span>
  );
}

export function Section({
  title,
  children,
  description,
  icon: Icon,
  actions,
  className,
  embedded = false,
  unframed = false,
}: {
  title: string;
  children: ReactNode;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
  embedded?: boolean;
  unframed?: boolean;
}) {
  if (embedded)
    return (
      <div
        role="group"
        aria-label={title}
        className={cn("min-w-0 space-y-3", className)}
      >
        {actions && (
          <div className="flex flex-wrap justify-end gap-2">{actions}</div>
        )}
        {children}
      </div>
    );
  const Container = unframed ? "section" : Card;
  const Content = unframed ? "div" : CardContent;
  return (
    <Container
      className={cn(
        "min-w-0",
        !unframed &&
          "gap-0 rounded-[2px] border-slate-200 bg-white py-0 shadow-xs",
        className,
      )}
    >
      <Content className={cn("space-y-3", !unframed && "p-3")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {Icon && (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-[2px] border border-primary/15 bg-primary/5 text-primary">
                <Icon aria-hidden="true" className="size-3.5" />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="m-0! font-heading text-base! leading-5! uppercase tracking-wide text-slate-900">
                {title}
              </h2>
              {description && (
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {description}
                </p>
              )}
            </div>
          </div>
          {actions}
        </div>
        {children}
      </Content>
    </Container>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="mb-1 text-[11px] font-medium text-slate-500">{label}</dt>
      <dd className="whitespace-pre-wrap break-words text-sm font-medium leading-5 text-slate-800">
        {children == null || children === "" || children === false
          ? "—"
          : children}
      </dd>
    </div>
  );
}

export function ApprovedBookingDetails({
  booking,
  showDossier = false,
}: {
  booking: ApprovedBookingDetail;
  showDossier?: boolean;
}) {
  return (
    <div className="space-y-3">
      <Section title="Customer & requested journey">
        <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Customer">{booking.customer.fullName}</Field>
          <Field label="Customer code">{booking.customer.customerCode}</Field>
          <Field label="Phone">{booking.customer.phone}</Field>
          <Field label="Origin">
            {booking.originAddress} ({booking.originCountry})
          </Field>
          <Field label="Destination">
            {booking.destinationAddress} ({booking.destinationCountry})
          </Field>
          <Field label="Booking origin coordinates">
            {booking.originLatitude != null && booking.originLongitude != null
              ? `${booking.originLatitude}, ${booking.originLongitude}`
              : null}
          </Field>
          <Field label="Booking destination coordinates">
            {booking.destinationLatitude != null &&
            booking.destinationLongitude != null
              ? `${booking.destinationLatitude}, ${booking.destinationLongitude}`
              : null}
          </Field>
          <Field label="Transport scope">
            <ApprovedBookingBadge
              value={booking.isInternational ? "INTERNATIONAL" : "DOMESTIC"}
            />
          </Field>
          <Field label="Requested departure">
            {formatBookingDate(booking.requestedDepartureDate)}
          </Field>
          <Field label="Requested arrival">
            {booking.requestedArrivalDate
              ? formatBookingDate(booking.requestedArrivalDate)
              : "—"}
          </Field>
          <Field label="Total horses">{String(booking.totalHorses)}</Field>
        </dl>
      </Section>
      <Section title="Transport instructions">
        <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
          <Field label="Special requirements">
            {booking.specialRequirements}
          </Field>
          <Field label="Customer note">{booking.customerNote}</Field>
        </dl>
      </Section>
      <Section title={`Horses (${booking.totalHorses})`}>
        {!booking.horses.length ? (
          <EmptyState message="No horse details are available for this booking." />
        ) : (
          <Table className="text-xs [&_td]:h-11 [&_td]:px-2.5 [&_td]:py-1.5">
            <TableHeader className="bg-[#e9e6de]">
              <TableRow>
                {[
                  "Name",
                  "Sex",
                  "Breed",
                  "Microchip",
                  "Passport",
                  "Special handling",
                ].map((label) => (
                  <TableHead
                    key={label}
                    className="h-11 px-2.5 font-heading text-[11px] uppercase tracking-[0.06em] text-gray-600"
                  >
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {booking.horses.map((horse) => (
                <TableRow key={horse.horseId}>
                  <TableCell className="font-medium">
                    {horse.horseName}
                  </TableCell>
                  <TableCell>
                    {horse.sex ? (
                      <span className="capitalize">
                        {horse.sex.toLowerCase()}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{horse.breed || "—"}</TableCell>
                  <TableCell>{horse.microchipNumber || "—"}</TableCell>
                  <TableCell>{horse.passportNumber || "—"}</TableCell>
                  <TableCell className="min-w-40 max-w-72 whitespace-pre-wrap">
                    {horse.specialHandlingNotes || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
      <Section title="Operational status">
        <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Transport">
            {booking.transport ? (
              <div className="space-y-1">
                <p>{booking.transport.transportCode}</p>
                <ApprovedBookingBadge value={booking.transport.status} />
              </div>
            ) : (
              "Not available"
            )}
          </Field>
          <Field label="Transport plan">
            {booking.transportPlan ? (
              <div className="space-y-1">
                <p>{booking.transportPlan.planCode}</p>
                <ApprovedBookingBadge value={booking.transportPlan.status} />
              </div>
            ) : (
              "Not created"
            )}
          </Field>
          {showDossier && (
            <div className="sm:col-span-2">
              <dt className="mb-1 text-[11px] font-medium text-slate-500">
                Compliance dossiers
              </dt>
              <dd>
                <DossierSummaries dossiers={booking.complianceDossiers} />
              </dd>
            </div>
          )}
        </dl>
      </Section>
    </div>
  );
}
