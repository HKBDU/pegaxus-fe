import type { EntityId } from "@/shared/types"
import { EmptyState } from "@/shared/components/common"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { formatPlanDate, formatPlanMoney } from "../format"
import type { TransportPlanQuotation as Quotation } from "../transport-plan.types"
import { Field, Section } from "./ApprovedBookingDetails"
import { ApprovedBookingBadge } from "./ApprovedBookingBadge"
import { Button } from "@/shared/components/ui/button"

export function QuotationDetails({ quotation }: { quotation: Quotation }) {
  return <Section title="Quotation & Payment">
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

export function TransportPlanQuotation({ transportPlanId, quotation, canManage = false }: { transportPlanId: EntityId; quotation?: Quotation | null; canManage?: boolean }) {
  // Flow 6 can provide verified data here; Flow 3 never guesses an ID or fetches an obsolete endpoint.
  return quotation && quotation.transportPlanId === transportPlanId ? <QuotationDetails quotation={quotation} /> :
    <Section title="Quotation & Payment">
      <p className="text-sm text-slate-600">Quotation acceptance and deposit are the milestone between plan creation and Phase 1 assignment.</p>
      <EmptyState message="Quotation management is handled in Flow 6. Integration is not available yet." />
      {canManage && <div className="space-y-2"><Button variant="outline" disabled title="The verified Flow 6 API and quotation workspace are not available in this checkout." className="rounded-md">Set Quotation</Button>
        <p className="text-xs text-slate-500">Set, edit and issue actions require the Flow 6 integration. TransportPlan metadata updates never persist quotation or payment data.</p></div>}
    </Section>
}
