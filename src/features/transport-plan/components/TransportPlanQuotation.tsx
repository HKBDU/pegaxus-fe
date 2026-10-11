import type { EntityId } from "@/shared/types"
import { EmptyState } from "@/shared/components/common"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { formatPlanDate, formatPlanMoney } from "../format"
import type { TransportPlanQuotation as Quotation } from "../types"
import { Field, Section } from "./ApprovedBookingDetails"
import { ApprovedBookingBadge } from "./ApprovedBookingBadge"
import { Button } from "@/shared/components/ui/button"
import { ReceiptText } from "lucide-react"

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
    <section aria-label="Quotation and payment checkpoint" className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><ReceiptText aria-hidden="true" className="size-5" /></span><div><h2 className="font-heading text-base uppercase">Quotation &amp; Payment</h2>
          <p className="mt-1 text-xs text-slate-500">Quotation acceptance and deposit precede Phase 1 assignment. Financial details are not available here yet.</p></div></div>
        {canManage && <Button variant="outline" size="sm" disabled title="Quotation management is not available yet." className="rounded-md">Set / Issue Quotation</Button>}
    </section>
}
