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
      <dl className="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-3">
        <Field label="Customer">{claim.customer.name}</Field>
        <Field label="Booking">{claim.booking.bookingCode}</Field>
        <Field label="Requested compensation"><span className="text-sm font-semibold">{money(claim.requestedCompensationAmount)}</span></Field>
        <Field label="Title" className="sm:col-span-3"><span className="font-semibold">{claim.title}</span></Field>
        <Field label="Description" className="sm:col-span-3">{claim.description}</Field>
        <Field label="Customer note" className="sm:col-span-3">{claim.customerNote}</Field>
        <Field label="Evidence note" className="sm:col-span-3">{claim.evidenceNote}</Field>
        <Field label="Review started">{formatInvoiceDateTime(claim.reviewedAt)}</Field>
        {claim.status === "CANCELLED" ? <Field label="Cancellation reason" className="sm:col-span-2">{claim.cancellationReason}</Field> : null}
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
      <dl className="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Handover code">{handover.handoverCode}</Field>
        <Field label="Transport">{claim.transport.transportCode}</Field>
        <Field label="Signed at">{formatInvoiceDateTime(handover.completedAt)}</Field>
        <Field label="e-POD signature">{handover.senderSignatureUrl && handover.receiverSignatureUrl ? "Signed digitally" : "Signature incomplete"}</Field>
        <Field label="Horse condition note (delivery)" className="sm:col-span-2">{handover.horseConditionNote}</Field>
        <Field label="Discrepancy note" className="sm:col-span-2">{handover.discrepancyNote}</Field>
        {claim.pickupHandover ? <Field label="Horse condition note (pickup)" className="sm:col-span-4">{claim.pickupHandover.horseConditionNote}</Field> : null}
        {claim.healthLogSummary ? (
          <Field label="Health logs" className="sm:col-span-2">
            {claim.healthLogSummary.totalCount} entries, {claim.healthLogSummary.abnormalCount} abnormal · last {formatInvoiceDateTime(claim.healthLogSummary.lastCheckedAt)}
          </Field>
        ) : null}
        <Field label="Incidents on this transport" className="sm:col-span-2">
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
      <dl className="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-3">
        <Field label="Resolution type">{RESOLUTION_TYPE_LABELS[resolution.resolutionType]}</Field>
        <Field label="Approved compensation">{money(resolution.approvedCompensationAmount)}</Field>
        <Field label="Decided at">{formatInvoiceDateTime(resolution.resolvedAt)}</Field>
        <Field label="Summary" className="sm:col-span-3">{resolution.resolutionSummary}</Field>
        <Field label="Corrective action" className="sm:col-span-3">{resolution.correctiveAction}</Field>
        <Field label="Internal note" className="sm:col-span-3">{resolution.internalNote}</Field>
      </dl>
    </section>
  )
}
