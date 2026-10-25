import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { MoneyText } from "@/features/invoice/components/MoneyText";
import type { AuditFinanceData } from "../../types";
import { BlockCard, StatusPill } from "./block-utils";
import { formatAuditDateTime } from "../../utils";

export function AuditFinanceBlock({ data }: { data?: AuditFinanceData }) {
  if (!data) return <BlockCard title="Financial Settlement" empty />;

  const summary = data.summary;
  const invoices = data.invoices ?? [];
  const emergencyExpenses = data.emergencyExpenses ?? [];

  return (
    <div className="space-y-3.5">
      <BlockCard
        title="Settlement Summary & Ledger Balance"
        empty={!summary}
        action={
          summary ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">Gross Settlement:</span>
              <MoneyText
                amount={summary.totalPaidAmount ?? 0}
                currency="VND"
                className="font-mono text-xs font-bold text-slate-900"
              />
            </div>
          ) : undefined
        }
      >
        {summary ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[2px] border border-slate-200 bg-slate-50/60 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Base Freight Fare
              </p>
              <div className="mt-1 flex items-baseline justify-between">
                <MoneyText
                  amount={summary.baseFareAmount ?? 0}
                  currency="VND"
                  className="font-mono text-base font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="rounded-[2px] border border-slate-200 bg-slate-50/60 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Cross-Border / Transit Surcharges
              </p>
              <div className="mt-1 flex items-baseline justify-between">
                <MoneyText
                  amount={
                    (summary.ferryChunnelFee ?? 0) +
                    (summary.bcpQuarantineFee ?? 0) +
                    (summary.insuranceFee ?? 0)
                  }
                  currency="VND"
                  className="font-mono text-base font-semibold text-slate-800"
                />
              </div>
            </div>

            <div className="rounded-[2px] border border-slate-200 bg-slate-50/60 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Emergency & Route Expenses
              </p>
              <div className="mt-1 flex items-baseline justify-between">
                <MoneyText
                  amount={summary.emergencyCost ?? 0}
                  currency="VND"
                  className="font-mono text-base font-semibold text-amber-700"
                />
              </div>
            </div>

            <div className="rounded-[2px] border border-amber-300 bg-amber-500/[0.04] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                Total Dossier Value
              </p>
              <div className="mt-1 flex items-baseline justify-between">
                <MoneyText
                  amount={summary.totalPaidAmount ?? 0}
                  currency="VND"
                  className="font-mono text-lg font-bold text-[#f39200]"
                />
              </div>
            </div>
          </div>
        ) : null}
      </BlockCard>

      <BlockCard
        title="Emergency Route Disbursements"
        empty={!emergencyExpenses.length}
        action={
          emergencyExpenses.length ? (
            <span className="text-xs text-amber-700 font-medium">
              {emergencyExpenses.length} disbursement logged
            </span>
          ) : (
            <span className="text-xs text-emerald-600 font-medium">
              No unplanned expenses
            </span>
          )
        }
      >
        {emergencyExpenses.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e6e2d9] bg-[#faf8f5]/60 hover:bg-[#faf8f5]/60">
                  <TableHead className="h-8 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Disbursement Code
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Category
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Justification / Reason
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Amount (VND)
                  </TableHead>
                  <TableHead className="h-8 text-right text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Approver
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emergencyExpenses.map((expense) => (
                  <TableRow
                    key={expense.expenseId}
                    className="border-b border-slate-100 hover:bg-amber-500/[0.02]"
                  >
                    <TableCell className="py-2.5 font-mono text-xs font-semibold text-slate-900">
                      {expense.expenseCode}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <StatusPill tone="warning">{expense.category}</StatusPill>
                    </TableCell>
                    <TableCell className="py-2.5 text-xs text-slate-700">
                      {expense.reason}
                    </TableCell>
                    <TableCell className="py-2.5 font-mono text-xs font-bold text-slate-900">
                      <MoneyText amount={expense.amount} currency="VND" />
                    </TableCell>
                    <TableCell className="py-2.5 text-right text-xs text-slate-600">
                      {expense.approvedBy ?? "System Auto"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </BlockCard>

      <BlockCard
        title="Associated Billing & Invoices"
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
                  <TableHead className="h-8 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Invoice No.
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Billing Type
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Payment Status
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Issue Date
                  </TableHead>
                  <TableHead className="h-8 text-right text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Invoice Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => {
                  const isPaid =
                    invoice.status === "PAID" || invoice.status === "SETTLED";

                  return (
                    <TableRow
                      key={invoice.invoiceId}
                      className="border-b border-slate-100 hover:bg-amber-500/[0.02]"
                    >
                      <TableCell className="py-2.5 font-mono text-xs font-semibold text-slate-900">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <StatusPill tone="info">{invoice.type}</StatusPill>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <StatusPill tone={isPaid ? "success" : "warning"}>
                          {invoice.status}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-slate-600">
                        {invoice.issuedAt
                          ? formatAuditDateTime(invoice.issuedAt)
                          : "—"}
                      </TableCell>
                      <TableCell className="py-2.5 text-right font-mono text-xs font-bold text-slate-900">
                        <MoneyText
                          amount={invoice.totalAmount}
                          currency="VND"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </BlockCard>
    </div>
  );
}
