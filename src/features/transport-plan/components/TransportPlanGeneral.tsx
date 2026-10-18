import { formatPlanDate } from "../format";
import type { TransportPlanDetail } from "../types";
import {
  DossierSummaries,
  Field,
  LocationReference,
  Section,
} from "./ApprovedBookingDetails";
import { ApprovedBookingBadge } from "./ApprovedBookingBadge";

export function TransportPlanGeneral({ plan }: { plan: TransportPlanDetail }) {
  return (
    <Section title="Transport Plan & Booking Information">
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <section
          aria-label="Transport plan metadata"
          className="min-w-0 space-y-3"
        >
          <h3 className="font-heading text-sm uppercase text-slate-600">
            Transport Plan
          </h3>
          <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
            <Field label="Transport code">{plan.transport.transportCode}</Field>
            <Field label="Origin Location">
              <LocationReference location={plan.originLocation} />
            </Field>
            <Field label="Destination Location">
              <LocationReference location={plan.destinationLocation} />
            </Field>
            <Field label="Transport status">
              <ApprovedBookingBadge value={plan.transport.status} />
            </Field>
            <Field label="Planned start">
              {formatPlanDate(plan.plannedStartAt)}
            </Field>
            <Field label="Planned end">
              {formatPlanDate(plan.plannedEndAt)}
            </Field>
            <Field label="Estimated distance">
              {plan.estimatedDistanceKm == null
                ? "—"
                : `${plan.estimatedDistanceKm} km`}
            </Field>
            <Field label="Estimated duration">
              {plan.estimatedDurationMinutes == null
                ? "—"
                : `${plan.estimatedDurationMinutes} minutes`}
            </Field>
          </dl>
          <dl>
            <Field label="Planning notes">{plan.planningNote}</Field>
          </dl>
        </section>
        <section
          aria-label="Booking summary"
          className="min-w-0 space-y-3 lg:border-l lg:border-slate-200 lg:pl-4"
        >
          <h3 className="font-heading text-sm uppercase text-slate-600">
            Booking
          </h3>
          <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
            <Field label="Customer">{plan.booking.customerName}</Field>
            <Field label="Booking status">
              <ApprovedBookingBadge value={plan.booking.status} />
            </Field>
            <Field label="Transport scope">
              <ApprovedBookingBadge
                value={
                  plan.booking.isInternational ? "INTERNATIONAL" : "DOMESTIC"
                }
              />
            </Field>
            <Field label="Origin">
              {plan.booking.originAddress} ({plan.booking.originCountry})
            </Field>
            <Field label="Destination">
              {plan.booking.destinationAddress} (
              {plan.booking.destinationCountry})
            </Field>
            <Field label="Total horses">
              {String(plan.booking.totalHorses)}
            </Field>
            <Field label="Booking origin coordinates">
              {plan.booking.originLatitude != null &&
              plan.booking.originLongitude != null
                ? `${plan.booking.originLatitude}, ${plan.booking.originLongitude}`
                : null}
            </Field>
            <Field label="Booking destination coordinates">
              {plan.booking.destinationLatitude != null &&
              plan.booking.destinationLongitude != null
                ? `${plan.booking.destinationLatitude}, ${plan.booking.destinationLongitude}`
                : null}
            </Field>
            <Field label="Requested departure">
              {plan.booking.requestedDepartureDate}
            </Field>
            <Field label="Requested arrival">
              {plan.booking.requestedArrivalDate}
            </Field>
            <Field label="Special requirements">
              {plan.booking.specialRequirements}
            </Field>
          </dl>
        </section>
      </div>
      <section
        aria-label="Compliance dossiers"
        className="space-y-2 border-t border-slate-200 pt-3"
      >
        <h3 className="font-heading text-sm uppercase text-slate-600">
          Compliance dossiers
        </h3>
        <DossierSummaries dossiers={plan.complianceDossiers} />
      </section>
      <section
        aria-label="Record information"
        className="min-w-0 border-t border-slate-200 pt-3"
      >
        <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Approved by">{plan.approvedBy?.fullName}</Field>
          <Field label="Approved at">{formatPlanDate(plan.approvedAt)}</Field>
          <Field label="Created at">{formatPlanDate(plan.createdAt)}</Field>
          <Field label="Updated at">{formatPlanDate(plan.updatedAt)}</Field>
        </dl>
      </section>
    </Section>
  );
}
