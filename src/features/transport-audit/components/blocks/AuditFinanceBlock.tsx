import { Fragment } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { MoneyText } from "@/features/invoice/components/MoneyText";
import { formatUtcDate } from "@/shared/utils/datetime";
import type { AuditFinanceData } from "../../types";
import { BlockCard, StatusPill, humanize } from "./block-utils";
import { formatAuditDateTime } from "../../utils";

const headClass =
  "h-8 text-[11px] font-bold uppercase tracking-wider text-slate-600";

const invoiceTone = (status: string) =>
  status === "PAID"
    ? "success"
    : status === "CANCELLED" || status === "VOID" || status === "OVERDUE"
      ? "danger"
      : "warning";

function SummaryTile({
  label,
  amount,
  highlight = false,
}: {
  label: string;
  amount: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-[2px] border border-amber-300 bg-amber-500/[0.04] p-3"
          : "rounded-[2px] border border-slate-200 bg-slate-50/60 p-3"
      }
    >
      <p
        className={`text-[10px] font-bold uppercase tracking-wider ${highlight ? "text-amber-800" : "text-slate-500"}`}
      >
        {label}
      </p>
      <MoneyText
        amount={amount}
        currency="VND"
        className={`mt-1 block font-mono text-base font-bold ${highlight ? "text-[#f39200]" : "text-slate-900"}`}
      />
    </div>
  );
}

export function AuditFinanceBlock({ data }: { data?: AuditFinanceData }) {
  if (!data) return <BlockCard title="Financial Settlement" empty />;

  const report = data.financialReport;
  const invoices = data.invoices;
  const emergencyCosts = data.emergencyCosts;

  return (
    <div className="space-y-3.5">
      <BlockCard
        title="Financial Report"
        empty={!report}
        action={
          report ? (
            <span className="font-mono text-xs text-slate-500">
              {report.reportCode} · {formatAuditDateTime(report.generatedAt)}
            </span>
          ) : undefined
        }
      >
        {report ? (
          <div className="space-y-2.5">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryTile label="Total invoiced" amount={report.totalInvoicedAmount} />
              <SummaryTile label="Total paid" amount={report.totalPaidAmount} highlight />
              <SummaryTile label="Emergency costs" amount={report.totalEmergencyCost} />
              <SummaryTile label="Outstanding" amount={report.outstandingAmount} />
            </div>
            {report.summaryNote ? (
              <p className="rounded-[2px] border border-slate-200 bg-white p-2 text-xs text-slate-600">
                {report.summaryNote}
              </p>
            ) : null}
          </div>
        ) : null}
      </BlockCard>

      <BlockCard
        title="Emergency Costs"
        empty={!emergencyCosts.length}
        action={
          emergencyCosts.length ? (
            <span className="text-xs text-amber-700 font-medium">
              {emergencyCosts.length}{" "}
              {emergencyCosts.length === 1 ? "approved request" : "approved requests"}
            </span>
          ) : (
            <span className="text-xs text-emerald-600 font-medium">
              No unplanned expenses
            </span>
          )
        }
      >
        {emergencyCosts.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e6e2d9] bg-[#faf8f5]/60 hover:bg-[#faf8f5]/60">
                  <TableHead className={headClass}>Request code</TableHead>
                  <TableHead className={headClass}>Incident</TableHead>
                  <TableHead className={headClass}>Category</TableHead>
                  <TableHead className={`${headClass} text-right`}>
                    Approved amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emergencyCosts.map((cost) => (
                  <TableRow
                    key={cost.requestCode}
                    className="border-b border-slate-100 hover:bg-amber-500/[0.02]"
                  >
                    <TableCell className="py-2.5 font-mono text-xs font-semibold text-slate-900">
                      {cost.requestCode}
                    </TableCell>
                    <TableCell className="py-2.5 font-mono text-xs text-slate-600">
                      {cost.incidentCode ?? "—"}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <StatusPill tone="warning">{humanize(cost.category)}</StatusPill>
                    </TableCell>
                    <TableCell className="py-2.5 text-right font-mono text-xs font-bold text-slate-900">
                      <MoneyText amount={cost.approvedAmount} currency="VND" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </BlockCard>

      <BlockCard
        title="Invoices & Receipts"
        empty={!invoices.length}
        action={
          <span className="text-xs text-slate-500">
            {invoices.length} {invoices.length === 1 ? "invoice" : "invoices"}
          </span>
        }
      >
        {invoices.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e6e2d9] bg-[#faf8f5]/60 hover:bg-[#faf8f5]/60">
                  <TableHead className={headClass}>Invoice No.</TableHead>
                  <TableHead className={headClass}>Type</TableHead>
                  <TableHead className={headClass}>Status</TableHead>
                  <TableHead className={headClass}>Issued</TableHead>
                  <TableHead className={headClass}>Due</TableHead>
                  <TableHead className={headClass}>Paid</TableHead>
                  <TableHead className={`${headClass} text-right`}>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <Fragment key={invoice.invoiceId}>
                    <TableRow className="border-b border-slate-100 hover:bg-amber-500/[0.02]">
                      <TableCell className="py-2.5 font-mono text-xs font-semibold text-slate-900">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <StatusPill tone="info">{humanize(invoice.type)}</StatusPill>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <StatusPill tone={invoiceTone(invoice.status)}>
                          {humanize(invoice.status)}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-slate-600">
                        {formatAuditDateTime(invoice.issuedAt)}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-slate-600">
                        {formatUtcDate(invoice.dueDate)}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-slate-600">
                        {formatAuditDateTime(invoice.paidAt)}
                      </TableCell>
                      <TableCell className="py-2.5 text-right font-mono text-xs font-bold text-slate-900">
                        <MoneyText amount={invoice.totalAmount} currency="VND" />
                      </TableCell>
                    </TableRow>
                    {invoice.receipts.map((receipt) => (
                      <TableRow
                        key={receipt.receiptId}
                        className="border-b border-slate-100 bg-slate-50/50 hover:bg-slate-50"
                      >
                        <TableCell className="py-1.5 pl-6 font-mono text-[11px] text-slate-600">
                          ↳ {receipt.receiptCode}
                        </TableCell>
                        <TableCell className="py-1.5 text-[11px] text-slate-600">
                          {humanize(receipt.paymentMethod)}
                        </TableCell>
                        <TableCell className="py-1.5">
                          <StatusPill
                            tone={receipt.status === "CONFIRMED" ? "success" : "warning"}
                          >
                            {humanize(receipt.status)}
                          </StatusPill>
                        </TableCell>
                        <TableCell className="py-1.5 text-[11px] text-slate-500" colSpan={2}>
                          Confirmed {formatAuditDateTime(receipt.confirmedAt)}
                        </TableCell>
                        <TableCell className="py-1.5 text-[11px] text-slate-500">
                          {formatAuditDateTime(receipt.paidAt)}
                        </TableCell>
                        <TableCell className="py-1.5 text-right font-mono text-[11px] text-slate-700">
                          <MoneyText amount={receipt.amount} currency="VND" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </BlockCard>
    </div>
  );
}
