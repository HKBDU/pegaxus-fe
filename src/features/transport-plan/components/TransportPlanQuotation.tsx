import type { EntityId } from "@/shared/types"
import { EmptyState } from "@/shared/components/common"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { formatPlanDate, formatPlanMoney } from "../format"
import type { TransportPlanQuotation as Quotation } from "../types"
import { Field, Section } from "./ApprovedBookingDetails"
import { ApprovedBookingBadge } from "./ApprovedBookingBadge"
import { Button } from "@/shared/components/ui/button"
import { ReceiptText } from "lucide-react"
import { Link } from "react-router-dom"
import { transportPlanDetail } from "@/app/route-config"

export function QuotationDetails({ quotation }: { quotation: Quotation }) {
  return <Section title="Quotation & Payment">
    <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Quotation status"><ApprovedBookingBadge value={quotation.status} /></Field>
      <Field label="Version">{String(quotation.versionNo)}</Field>
      <Field label="Currency">VND</Field>
      <Field label="Issued at">{formatPlanDate(quotation.issuedAt)}</Field>
    </dl>
    {quotation.items.length ? <Table className="text-xs [&_td]:h-11 [&_td]:px-2.5 [&_td]:py-1.5">
      <TableHeader className="bg-[#e9e6de]"><TableRow>{["Category", "Description", "Amount"].map((label) => <TableHead key={label} className={`h-11 px-2.5 font-heading text-[11px] uppercase tracking-[0.06em] text-gray-600 ${label === "Amount" ? "text-right" : ""}`}>{label}</TableHead>)}</TableRow></TableHeader>
      <TableBody>{quotation.items.map((item) => <TableRow key={item.quotationItemId}>
        <TableCell className="whitespace-nowrap">{item.category.replaceAll("_", " ")}</TableCell>
        <TableCell className="min-w-44 whitespace-pre-wrap">{item.description}</TableCell>
        <TableCell className="whitespace-nowrap text-right tabular-nums">{formatPlanMoney(item.amount)}</TableCell>
      </TableRow>)}</TableBody>
    </Table> : <EmptyState message="No cost breakdown has been added to this quotation." />}
    <dl className="grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
      <Field label="Total amount"><span className="font-semibold text-primary">{formatPlanMoney(quotation.totalAmount)}</span></Field>
      <Field label="Quotation notes">{quotation.note}</Field>
    </dl>
  </Section>
}

export function TransportPlanQuotation({ transportPlanId, quotation, canManage = false }: { transportPlanId: EntityId; quotation?: Quotation | null; canManage?: boolean }) {
  // Flow 6 can provide verified data here; Flow 3 never guesses an ID or fetches an obsolete endpoint.
  return quotation && quotation.transportPlanId === transportPlanId ? <QuotationDetails quotation={quotation} /> :
    <section aria-label="Quotation and payment checkpoint" className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-slate-200 bg-white p-3 shadow-xs">
        <div className="flex min-w-0 flex-1 items-start gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-[2px] bg-slate-100 text-slate-600"><ReceiptText aria-hidden="true" className="size-4" /></span><div className="min-w-0"><h2 className="m-0! font-heading text-base! leading-5! uppercase">Quotation &amp; Payment</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">View quotation, deposit and payment information in Invoices.</p></div></div>
        {canManage && <Button asChild variant="outline" size="sm" className="rounded-[2px]"><Link to={`${transportPlanDetail(transportPlanId)}?tab=invoices`}>View Invoices</Link></Button>}
    </section>
}
