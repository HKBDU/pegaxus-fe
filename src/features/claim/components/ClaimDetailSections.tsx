import { CardTitle, ClaimStatusBadge, ClaimTypeBadge, Field, panelClass, SummaryCell } from "@/features/claim/components/ClaimPrimitives"
import { RESOLUTION_TYPE_LABELS } from "@/features/claim/constants"
import type { Claim } from "@/features/claim/types"
import { formatInvoiceDateTime, formatMoney } from "@/features/invoice/utils"
import { cn } from "@/lib/utils"

const money = (amount: number | null | undefined) => (amount == null ? "—" : formatMoney(amount))

/** The strip at the top of the manager pages (same markup as the Booking Details summary). */
export function ClaimSummaryStrip({ claim }: { claim: Claim }) {
  return (
    <dl className={cn(panelClass, "grid grid-cols-2 gap-x-4 px-4 lg:grid-cols-4 lg:gap-x-0 lg:pr-0")}>
      <SummaryCell first label="Claim code"><span className="text-lg leading-5 font-semibold text-gray-900">{claim.claimCode}</span></SummaryCell>
      <SummaryCell label="Status"><ClaimStatusBadge status={claim.status} /></SummaryCell>
      <SummaryCell label="Claim type"><ClaimTypeBadge type={claim.claimType} /></SummaryCell>
      <SummaryCell label="Submitted">{formatInvoiceDateTime(claim.submittedAt)}</SummaryCell>
    </dl>
  )
}

export function ClaimInformationCard({ claim }: { claim: Claim }) {
  return (
    <section aria-label="Claim information" className={cn(panelClass, "p-4")}>
      <CardTitle>Claim information</CardTitle>
      <dl className="mt-3 space-y-1.5">
        <Field label="Customer">{claim.customer.name}</Field>
        <Field label="Booking">{claim.booking.bookingCode}</Field>
        <Field label="Requested compensation">{money(claim.requestedCompensationAmount)}</Field>
        <Field label="Review started">{formatInvoiceDateTime(claim.reviewedAt)}</Field>
        <Field label="Title">{claim.title}</Field>
        <Field label="Description">{claim.description}</Field>
        <Field label="Customer note">{claim.customerNote}</Field>
        <Field label="Evidence note">{claim.evidenceNote}</Field>
        {claim.status === "CANCELLED" ? <Field label="Cancellation reason">{claim.cancellationReason}</Field> : null}
      </dl>
    </section>
  )
}

/** The delivery record the customer signed, with what the manager needs to cross-check it (CL4 manager version). */
export function ClaimHandoverCard({ claim }: { claim: Claim }) {
  const { handover } = claim
  return (
    <section aria-label="Delivery record" className={cn(panelClass, "p-4")}>
      <CardTitle>Delivery record</CardTitle>
      <dl className="mt-3 space-y-1.5">
        <Field label="Handover code">{handover.handoverCode}</Field>
        <Field label="Transport">{claim.transport.transportCode}</Field>
        <Field label="Signed at">{formatInvoiceDateTime(handover.completedAt)}</Field>
        <Field label="e-POD signature">{handover.senderSignatureUrl && handover.receiverSignatureUrl ? "Signed digitally" : "Signature incomplete"}</Field>
        <Field label="Horse condition note (delivery)">{handover.horseConditionNote}</Field>
        <Field label="Discrepancy note">{handover.discrepancyNote}</Field>
        {claim.pickupHandover ? <Field label="Horse condition note (pickup)">{claim.pickupHandover.horseConditionNote}</Field> : null}
        {claim.healthLogSummary ? (
          <Field label="Health logs">
            {claim.healthLogSummary.totalCount} entries, {claim.healthLogSummary.abnormalCount} abnormal · last {formatInvoiceDateTime(claim.healthLogSummary.lastCheckedAt)}
          </Field>
        ) : null}
        <Field label="Incidents on this transport">
          {claim.incidents?.length ? (
            <ul className="space-y-0.5">
              {claim.incidents.map((incident) => (
                <li key={incident.incidentReportId}>{incident.incidentCode} · {incident.category} · {incident.severity} · {incident.status}</li>
              ))}
            </ul>
          ) : (
            "None"
          )}
        </Field>
      </dl>
    </section>
  )
}

/** What was decided (read-only), including the two fields that only the manager sees. */
export function ClaimOutcomeCard({ claim }: { claim: Claim }) {
  const { resolution } = claim
  if (!resolution) return null
  return (
    <section aria-label="Outcome" className={cn(panelClass, "p-4")}>
      <CardTitle>{claim.status === "REJECTED" ? "Decision" : "Outcome"}</CardTitle>
      <dl className="mt-3 space-y-1.5">
        <Field label="Resolution type">{RESOLUTION_TYPE_LABELS[resolution.resolutionType]}</Field>
        <Field label="Approved compensation">{money(resolution.approvedCompensationAmount)}</Field>
        <Field label="Decided at">{formatInvoiceDateTime(resolution.resolvedAt)}</Field>
        <Field label="Summary">{resolution.resolutionSummary}</Field>
        <Field label="Corrective action">{resolution.correctiveAction}</Field>
        <Field label="Internal note">{resolution.internalNote}</Field>
      </dl>
    </section>
  )
}
