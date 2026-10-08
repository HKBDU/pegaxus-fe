import type { EntityId } from "@/shared/types"
import { EmptyState, ErrorState } from "@/shared/components/common"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { useTransportPlanQuotation } from "../hooks/useTransportPlans"
import { formatPlanDate, formatPlanMoney } from "../format"
import { getTransportPlanError } from "../transport-plan.services"
import type { TransportPlanQuotation as Quotation } from "../transport-plan.types"
import { Field, Section } from "./ApprovedBookingDetails"
import { ApprovedBookingBadge } from "./ApprovedBookingBadge"

export function QuotationDetails({ quotation }: { quotation: Quotation }) {
  return <Section title="Estimated quotation">
    <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Quotation status"><ApprovedBookingBadge value={quotation.status} /></Field>
      <Field label="Version">{String(quotation.versionNo)}</Field>
      <Field label="Currency">{quotation.currency}</Field>
      <Field label="Issued at">{formatPlanDate(quotation.issuedAt)}</Field>
    </dl>
    {quotation.items.length ? <Table>
      <TableHeader className="bg-[#e9e6de]"><TableRow>{["Category", "Description", "Amount"].map((label) => <TableHead key={label} className="font-heading text-xs uppercase">{label}</TableHead>)}</TableRow></TableHeader>
      <TableBody>{quotation.items.map((item) => <TableRow key={item.quotationItemId}>
        <TableCell className="whitespace-nowrap">{item.category.replaceAll("_", " ")}</TableCell>
        <TableCell className="min-w-44 whitespace-pre-wrap">{item.description}</TableCell>
        <TableCell className="whitespace-nowrap text-right">{formatPlanMoney(item.amount, quotation.currency)}</TableCell>
      </TableRow>)}</TableBody>
    </Table> : <EmptyState message="No cost breakdown has been added to this quotation." />}
    <dl className="grid gap-5 border-t pt-4 sm:grid-cols-2">
      <Field label="Total amount"><span className="font-semibold text-primary">{formatPlanMoney(quotation.totalAmount, quotation.currency)}</span></Field>
      <Field label="Quotation notes">{quotation.note}</Field>
    </dl>
  </Section>
}

export function TransportPlanQuotation({ transportPlanId }: { transportPlanId: EntityId }) {
  const query = useTransportPlanQuotation(transportPlanId)
  if (query.isPending) return <Skeleton aria-label="Loading quotation" className="h-56 rounded-[2px] bg-[#e9e6de]" />
  if (query.isError) {
    const error = getTransportPlanError(query.error, "quotation")
    return <ErrorState message={error.message} onRetry={error.retryable ? () => void query.refetch() : undefined} />
  }
  return query.data ? <QuotationDetails quotation={query.data} /> : <EmptyState message="No quotation has been created for this transport plan." />
}
