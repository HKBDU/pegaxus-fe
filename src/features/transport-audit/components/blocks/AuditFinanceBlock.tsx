import { Badge } from "@/shared/components/ui/badge";
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
import { BlockCard } from "./block-utils";
export function AuditFinanceBlock({ data }: { data?: AuditFinanceData }) {
  if (!data) return <BlockCard title="Finance" empty />;
  const summary = data.summary;
  return (
    <div className="space-y-4">
      <BlockCard title="Settlement summary" empty={!summary}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {summary
            ? Object.entries(summary)
                .filter(([key]) => key !== "currency")
                .map(([key, value]) => (
                  <div key={key}>
                    <p className="text-[10px] uppercase text-slate-500">
                      {key.replaceAll(/([A-Z])/g, " $1")}
                    </p>
                    <MoneyText
                      amount={Number(value)}
                      currency="VND"
                      className="text-sm font-semibold"
                    />
                  </div>
                ))
            : null}
        </div>
      </BlockCard>
      <BlockCard
        title="Emergency expenses"
        empty={!data.emergencyExpenses?.length}
      >
        {data.emergencyExpenses?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Approved by</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.emergencyExpenses.map((expense) => (
                <TableRow key={expense.expenseId}>
                  <TableCell className="font-mono">
                    {expense.expenseCode}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{expense.category}</Badge>
                  </TableCell>
                  <TableCell>{expense.reason}</TableCell>
                  <TableCell>
                    <MoneyText amount={expense.amount} currency="VND" />
                  </TableCell>
                  <TableCell>{expense.approvedBy ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </BlockCard>
      <BlockCard title="Invoices" empty={!data.invoices.length}>
        {data.invoices.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.invoices.map((invoice) => (
                <TableRow key={invoice.invoiceId}>
                  <TableCell className="font-mono">
                    {invoice.invoiceNumber}
                  </TableCell>
                  <TableCell>{invoice.type}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{invoice.status}</Badge>
                  </TableCell>
                  <TableCell>{invoice.issuedAt ?? "—"}</TableCell>
                  <TableCell>
                    <MoneyText amount={invoice.totalAmount} currency="VND" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </BlockCard>
    </div>
  );
}
