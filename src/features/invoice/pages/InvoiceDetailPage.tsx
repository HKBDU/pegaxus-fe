import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Tabs } from "radix-ui";
import { useQueryClient } from "@tanstack/react-query";
import { canAccess } from "@/features/auth/access-control";
import { useAuthStore } from "@/features/auth/store";
import { PageHeader } from "@/shared/components/PageHeader";
import { ErrorState } from "@/shared/components/common";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useInvoice } from "@/features/invoice/hooks/useInvoices";
import { getInvoiceError } from "@/features/invoice/services";
import { invoiceIdSchema } from "@/features/invoice/schemas";
import { invoiceListPath } from "@/features/invoice/constants";
import { InvoiceActions } from "@/features/invoice/components/InvoiceActions";
import { QuotationBanner } from "@/features/invoice/components/QuotationBanner";
import { InvoiceMockIndicator } from "@/features/invoice/components/InvoicePresentation";
import { InvoiceStatusBadge } from "@/features/invoice/components/InvoiceStatusBadge";
import { InvoiceTypeBadge } from "@/features/invoice/components/InvoiceTypeBadge";
import { invoiceDate } from "@/features/invoice/utils";
import { InvoiceDetailSections } from "@/features/invoice/components/InvoiceDetailSections";
import { InvoiceStatusHistory } from "@/features/invoice/components/InvoiceStatusHistory";

export default function InvoiceDetailPage() {
  const { invoiceId = "", bookingId = "" } = useParams<{
    invoiceId: string;
    bookingId?: string;
  }>();
  const principal = useAuthStore((state) => state.principal);
  const manager = canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] });
  const customer = !manager && canAccess(principal, { anyRole: ["CUSTOMER"] });
  const valid =
    invoiceIdSchema.safeParse(invoiceId).success && (manager || customer);
  const query = useInvoice(invoiceId, valid);
  const client = useQueryClient(),
    location = useLocation();
  const [params, setParams] = useSearchParams();
  const invoice = query.data,
    error = query.isError ? getInvoiceError(query.error) : null;
  const effectiveBookingId = bookingId || invoice?.booking.bookingId || "";
  const returnSearch = (
    location.state as { invoiceListSearch?: unknown } | null
  )?.invoiceListSearch;
  const backHref = manager
    ? invoiceListPath +
      (typeof returnSearch === "string"
        ? `?${new URLSearchParams(returnSearch)}`
        : "")
    : effectiveBookingId
      ? `/bookings/${encodeURIComponent(effectiveBookingId)}`
      : "/bookings";
  const activeTab = params.get("tab") === "history" ? "history" : "overview";
  async function onInvoiceChanged() {
    await client.invalidateQueries({ queryKey: ["invoice"] });
  }
  return (
    <div className="booking-page-shell min-w-0 min-h-[calc(100svh-5rem)] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
      <div className="booking-page-enter mx-auto w-full min-w-0 max-w-[1152px] space-y-5">
        <InvoiceMockIndicator />
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap gap-2 text-xs text-slate-500"
        >
          <Link to={backHref} className="hover:text-primary">
            {manager ? "Invoices" : "Booking"}
          </Link>
          <span aria-hidden="true">/</span>
          <span>Invoice Detail</span>
        </nav>
        <PageHeader
          title="Invoice Detail"
          backHref={backHref}
          backLabel={manager ? "Back to Invoices" : "Back to Booking"}
        />
        {!manager && !customer ? (
          <ErrorState message="You do not have permission to view invoices." />
        ) : !valid ? (
          <ErrorState message="The invoice identifier is missing." />
        ) : error ? (
          <ErrorState
            message={error.message}
            onRetry={error.retryable ? () => void query.refetch() : undefined}
          />
        ) : query.isPending ? (
          <div role="status" aria-label="Loading invoice" className="space-y-5">
            <Skeleton className="h-28 w-full" />
            <div className="grid gap-5 md:grid-cols-2">
              <Skeleton className="h-72 w-full" />
              <Skeleton className="h-72 w-full" />
            </div>
          </div>
        ) : invoice &&
          customer &&
          bookingId &&
          invoice.booking.bookingId !== bookingId ? (
          <ErrorState message="This invoice does not belong to the booking in this URL." />
        ) : invoice ? (
          <>
            <section className="space-y-4 rounded-[2px] border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-heading text-2xl">
                    {invoice.invoiceNumber}
                  </h2>
                  <InvoiceTypeBadge type={invoice.type} />
                  <InvoiceStatusBadge status={invoice.status} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <InvoiceActions
                    invoice={invoice}
                    manager={manager}
                    onInvoiceChanged={onInvoiceChanged}
                  />
                </div>
              </div>
              <dl className="grid gap-3 text-xs sm:grid-cols-4">
                {(
                  [
                    ["Currency", invoice.currency],
                    ["Due Date", invoiceDate(invoice.dueDate)],
                    ["Issued At", invoiceDate(invoice.issuedAt)],
                    ["Paid At", invoiceDate(invoice.paidAt)],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="mt-1 font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-xs text-slate-500">
                Timestamps are shown in your local time zone.
              </p>
            </section>
            {invoice.type === "QUOTATION" ? <QuotationBanner /> : null}
            {invoice.type === "CREDIT_NOTE" ? (
              <p
                role="note"
                className="rounded-[2px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
              >
                Credit note — Compensation payable to the customer.
              </p>
            ) : null}
            <Tabs.Root
              value={activeTab}
              onValueChange={(tab) =>
                setParams((current) => {
                  const next = new URLSearchParams(current);
                  next.set("tab", tab);
                  return next;
                })
              }
            >
              <Tabs.List
                aria-label="Invoice sections"
                className="mb-5 flex gap-2 overflow-x-auto border-b border-slate-200"
              >
                <Tabs.Trigger
                  value="overview"
                  className="border-b-2 border-transparent px-5 py-3 font-heading text-sm uppercase focus-visible:outline-primary data-[state=active]:border-primary data-[state=active]:text-primary"
                >
                  Overview
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="history"
                  className="border-b-2 border-transparent px-5 py-3 font-heading text-sm uppercase focus-visible:outline-primary data-[state=active]:border-primary data-[state=active]:text-primary"
                >
                  Status History
                </Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content
                value="overview"
                className="outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <InvoiceDetailSections invoice={invoice} manager={manager} />
              </Tabs.Content>
              <Tabs.Content
                value="history"
                className="outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                {activeTab === "history" ? (
                  <InvoiceStatusHistory invoiceId={invoice.invoiceId} />
                ) : null}
              </Tabs.Content>
            </Tabs.Root>
          </>
        ) : null}
      </div>
    </div>
  );
}
