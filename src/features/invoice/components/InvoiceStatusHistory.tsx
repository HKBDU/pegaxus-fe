import {
  ArrowRight,
  Ban,
  CircleCheck,
  Clock,
  FilePlus2,
  Send,
} from "lucide-react";
import { DateTimeUtc } from "@/shared/components/DateTimeUtc";
import { canAccess } from "@/features/auth/access-control";
import { useAuthStore } from "@/features/auth/store";
import { EmptyState, ErrorState } from "@/shared/components/common";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { invoiceIdSchema } from "@/features/invoice/schemas";
import { useInvoiceStatusHistory } from "@/features/invoice/hooks/useInvoices";
import { getInvoiceError } from "@/features/invoice/services";
import { humanize, INVOICE_STATUS_LABELS } from "@/features/invoice/constants";
import type { InvoiceHistoryType } from "@/features/invoice/types";
import { InvoiceStatusBadge } from "@/features/invoice/components/InvoiceStatusBadge";

const events: Record<
  InvoiceHistoryType,
  { label: string; icon: typeof Clock; color: string }
> = {
  CREATE: {
    label: "Created",
    icon: FilePlus2,
    color: "border-slate-200 bg-slate-100 text-slate-600",
  },
  ISSUE: {
    label: "Issued",
    icon: Send,
    color: "border-blue-200 bg-blue-50 text-blue-700",
  },
  RECORD_PAYMENT: {
    label: "Payment Recorded",
    icon: CircleCheck,
    color: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  MARK_OVERDUE: {
    label: "Marked Overdue",
    icon: Clock,
    color: "border-red-200 bg-red-50 text-red-700",
  },
  CANCEL: {
    label: "Cancelled",
    icon: Ban,
    color: "border-red-200 bg-red-50 text-red-700",
  },
};

export function InvoiceStatusHistory({ invoiceId }: { invoiceId: string }) {
  const principal = useAuthStore((state) => state.principal);
  const allowed = canAccess(principal, {
    anyRole: ["LOGISTICS_MANAGER", "CUSTOMER"],
  });
  const query = useInvoiceStatusHistory(invoiceId);
  const error = query.isError ? getInvoiceError(query.error) : null;
  const history = query.data ?? [];
  return (
    <Card className="min-w-0 gap-5 rounded-[2px] border-slate-200 shadow-none">
      <CardHeader className="gap-2 px-5 sm:px-6">
        <h2 className="font-heading text-xl uppercase text-slate-900">
          Status History
        </h2>
        <p className="text-xs text-slate-500 sm:text-sm">
          Track invoice status changes over time. Timestamps are shown in UTC.
        </p>
      </CardHeader>
      <CardContent className="min-w-0 px-5 sm:px-6">
        {!allowed ? (
          <ErrorState message="You do not have permission to view invoice history." />
        ) : !invoiceIdSchema.safeParse(invoiceId).success ? (
          <ErrorState message="An invoice identifier is required." />
        ) : error ? (
          <ErrorState
            message={error.message}
            onRetry={error.retryable ? () => void query.refetch() : undefined}
          />
        ) : query.isPending ? (
          <div
            role="status"
            aria-label="Loading invoice status history"
            className="space-y-6"
          >
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="flex gap-4">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="w-full space-y-3">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-3 w-full max-w-sm" />
                </div>
              </div>
            ))}
          </div>
        ) : !history.length ? (
          <EmptyState message="No status history data found." />
        ) : (
          <ol
            aria-label="Invoice status timeline"
            aria-busy={query.isFetching}
            className="space-y-0"
          >
            {history.map((event, index) => {
              const presentation = events[event.type],
                Icon = presentation.icon;
              return (
                <li
                  key={event.historyId}
                  className="relative flex min-w-0 gap-4 pb-7 last:pb-0 sm:gap-5"
                >
                  {index < history.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className="absolute top-10 bottom-0 left-5 w-px bg-slate-200"
                    />
                  ) : null}
                  <span
                    aria-hidden="true"
                    className={`relative flex size-10 shrink-0 items-center justify-center rounded-full border ${presentation.color}`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-3 pt-1 [overflow-wrap:anywhere]">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {presentation.label}
                    </h3>
                    <div
                      className="flex flex-wrap items-center gap-2"
                      aria-label={`${event.previousStatus ? INVOICE_STATUS_LABELS[event.previousStatus] : "No previous status"} to ${INVOICE_STATUS_LABELS[event.newStatus]}`}
                    >
                      {event.previousStatus ? (
                        <InvoiceStatusBadge status={event.previousStatus} />
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                      <ArrowRight
                        aria-hidden="true"
                        className="size-3.5 text-slate-400"
                      />
                      <InvoiceStatusBadge status={event.newStatus} />
                    </div>
                    <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      <time dateTime={event.changedAt} className="tabular-nums">
                        <DateTimeUtc value={event.changedAt} compact />
                      </time>
                      <span className="min-w-0 [overflow-wrap:anywhere]">
                        {event.changedBy.fullName}
                        {event.changedBy.role
                          ? ` · ${humanize(event.changedBy.role)}`
                          : ""}
                      </span>
                    </div>
                    {event.type === "CANCEL" || event.reason !== null ? (
                      <div
                        className={`space-y-1 rounded-[2px] border p-3 ${event.type === "CANCEL" ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}
                      >
                        <p className="text-xs font-semibold text-slate-700">
                          {event.type === "CANCEL"
                            ? "Cancellation reason"
                            : "Reason"}
                        </p>
                        <p className="whitespace-pre-wrap text-sm text-slate-800 [overflow-wrap:anywhere]">
                          {event.reason ?? "—"}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
