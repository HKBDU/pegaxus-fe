import { CheckCircle2, TriangleAlert } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import type { FinancialReport } from "../schemas";
import { financialLabel, financialMoney } from "../presentation";
import { PricingBreakdown } from "./PricingBreakdown";

const issues: Record<string, string> = {
  PAID_WITHOUT_RECEIPT: "Paid invoice without a confirmed receipt",
  RECEIPT_AMOUNT_MISMATCH: "Receipt amount differs from invoice total",
  RECEIPT_ON_UNPAID_INVOICE: "Confirmed receipt on an unpaid invoice",
  MULTIPLE_CONFIRMED_RECEIPTS: "Multiple confirmed receipts",
};

export function FinancialOverview({ report }: { report: FinancialReport }) {
  return (
    <section aria-label="Financial overview" className="min-w-0 space-y-3">
      <div className="grid min-w-0 grid-cols-1 rounded-[2px] border border-slate-200 bg-white sm:grid-cols-2 min-[1200px]:grid-cols-4">
        {(
          [
            ["Total invoiced", report.totalInvoicedAmount],
            ["Total paid", report.totalPaidAmount],
            ["Emergency cost", report.totalEmergencyCost],
            ["Outstanding", report.outstandingAmount],
          ] as const
        ).map(([label, value], index) => (
          <div
            key={label}
            className="min-w-0 border-slate-200 p-4 not-first:border-t sm:odd:border-r sm:nth-2:border-t-0 min-[1200px]:not-first:border-t-0 min-[1200px]:not-last:border-r"
          >
            <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p
              className={`mt-2 mb-0 break-words text-xl font-semibold tabular-nums ${index === 3 ? "text-primary" : "text-slate-900"}`}
            >
              {financialMoney(value)}
            </p>
          </div>
        ))}
      </div>
      {report.isProvisional ? (
        <p
          role="note"
          className="m-0 border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          Provisional figures are not saved. Financial refresh and note saving
          are unavailable until the transport is completed.
        </p>
      ) : null}
      {report.isStale ? (
        <p
          role="status"
          className="m-0 border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          Source data has changed. These figures remain the saved snapshot until
          you refresh financial data.
        </p>
      ) : null}
      {report.warnings
        .filter(
          (warning) =>
            !(report.isProvisional && warning === "TRANSPORT_NOT_COMPLETED"),
        )
        .map((warning, index) => (
          <p
            key={`${warning}-${index}`}
            role="note"
            className="m-0 break-words text-sm text-amber-800"
          >
            {financialLabel(warning)}
          </p>
        ))}
    </section>
  );
}

export function ReconciliationSection({ report }: { report: FinancialReport }) {
  const reconciliation = report.reconciliation;
  return (
    <Card className="min-w-0 gap-3 rounded-[2px] py-4 shadow-none">
      <CardHeader className="px-4">
        <CardTitle className="font-heading text-lg uppercase">
          Reconciliation
        </CardTitle>
        <p
          className={`m-0 flex items-start gap-2 text-xs ${reconciliation.hasMismatch ? "text-amber-800" : "text-emerald-800"}`}
        >
          {reconciliation.hasMismatch ? (
            <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
          ) : (
            <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
          )}
          {reconciliation.hasMismatch
            ? "Review the discrepancies below. Report viewing and note editing remain available."
            : "No discrepancies detected."}
        </p>
      </CardHeader>
      {reconciliation.items.length ? (
        <CardContent className="min-w-0 px-4">
          <div className="rounded-[2px] border border-slate-200">
            <Table className="min-w-[620px] text-xs">
              <TableCaption className="sr-only">
                Reconciliation of invoices and confirmed receipts, in VND
              </TableCaption>
              <TableHeader className="bg-stone-100">
                <TableRow>
                  {["Invoice number", "Discrepancy", "Expected", "Actual"].map(
                    (label, index) => (
                      <TableHead
                        key={label}
                        scope="col"
                        className={`h-10 px-3 font-heading text-xs uppercase ${index > 1 ? "text-right" : ""}`}
                      >
                        {label}
                      </TableHead>
                    ),
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reconciliation.items.map((item, index) => (
                  <TableRow
                    key={`${item.invoiceId}-${item.issue}-${index}`}
                    className="even:bg-stone-50"
                  >
                    <TableCell className="px-3 py-2.5 font-medium">
                      {item.invoiceNumber}
                    </TableCell>
                    <TableCell className="max-w-72 whitespace-normal px-3">
                      {issues[item.issue] ?? financialLabel(item.issue)}
                    </TableCell>
                    <TableCell className="px-3 text-right tabular-nums">
                      {financialMoney(item.expectedAmount)}
                    </TableCell>
                    <TableCell className="px-3 text-right tabular-nums">
                      {financialMoney(item.actualAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}

export function SuggestedItemsTable({ report }: { report: FinancialReport }) {
  return (
    <Card className="min-w-0 gap-3 rounded-[2px] py-4 shadow-none">
      <CardHeader className="px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-heading text-lg uppercase">
            Suggested invoice items
          </CardTitle>
          <Badge variant="outline">Read-only</Badge>
        </div>
        <p className="m-0 text-xs text-slate-500">
          Reference figures only. Final invoice lines are generated from the
          issued quotation by the billing service.
        </p>
      </CardHeader>
      <CardContent className="min-w-0 px-4">
        {report.suggestedItems.length ? (
          <div className="rounded-[2px] border border-slate-200">
            <Table className="min-w-[740px] text-xs">
              <TableCaption className="sr-only">
                Suggested unit prices and separate reference amounts in VND;
                these do not recalculate report totals
              </TableCaption>
              <TableHeader className="bg-stone-100">
                <TableRow>
                  {[
                    "Description",
                    "Item type",
                    "Qty",
                    "Suggested price",
                    "Reference amount",
                    "Warning",
                  ].map((label, index) => (
                    <TableHead
                      key={label}
                      scope="col"
                      className={`h-10 px-3 font-heading text-xs uppercase ${index >= 2 && index <= 4 ? "text-right" : ""}`}
                    >
                      {label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.suggestedItems.map((item, index) => (
                  <TableRow
                    key={`${item.itemType}-${item.description}-${index}`}
                    className="even:bg-stone-50"
                  >
                    <TableCell className="min-w-56 max-w-80 whitespace-normal px-3 py-3 align-top">
                      <p className="m-0 break-words font-medium text-slate-900">
                        {item.description}
                      </p>
                      <PricingBreakdown item={item} />
                    </TableCell>
                    <TableCell className="max-w-40 whitespace-normal px-3 align-top">
                      {financialLabel(item.itemType)}
                    </TableCell>
                    <TableCell className="px-3 text-right align-top tabular-nums">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="px-3 text-right align-top tabular-nums">
                      {financialMoney(item.suggestedPrice)}
                    </TableCell>
                    <TableCell className="px-3 text-right align-top tabular-nums">
                      {financialMoney(item.referenceAmount)}
                    </TableCell>
                    <TableCell className="max-w-44 whitespace-normal px-3 align-top text-amber-800">
                      {item.warning ? financialLabel(item.warning) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="m-0 py-2 text-sm text-slate-500">
            No suggested fee items are available for this transport.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
