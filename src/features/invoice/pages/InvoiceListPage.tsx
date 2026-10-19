import { useSearchParams } from "react-router-dom";
import { canAccess } from "@/features/auth/access-control";
import { useAuthStore } from "@/features/auth/store";
import { PageHeader } from "@/shared/components/PageHeader";
import { ErrorState } from "@/shared/components/common";
import { useDebounce } from "@/shared/hooks";
import { invoiceQuerySchema } from "@/features/invoice/schemas";
import { initialInvoiceParams } from "@/features/invoice/constants";
import { useInvoices } from "@/features/invoice/hooks/useInvoices";
import {
  getInvoiceError,
  invoicePaginationMeta,
} from "@/features/invoice/services";
import type { InvoiceQueryParams } from "@/features/invoice/types";
import { InvoiceFilters } from "@/features/invoice/components/InvoiceFilters";
import { InvoiceTable } from "@/features/invoice/components/InvoiceTable";
import { InvoiceMockIndicator } from "@/features/invoice/components/InvoicePresentation";

const filterKeys = [
  "type",
  "status",
  "transportPlanId",
  "bookingId",
  "issuedFrom",
  "issuedTo",
  "dueFrom",
  "dueTo",
  "search",
] as const;
export default function InvoiceListPage() {
  const principal = useAuthStore((state) => state.principal);
  const [url, setUrl] = useSearchParams();
  const parsed = invoiceQuerySchema.safeParse({
    ...Object.fromEntries(
      filterKeys.flatMap((key) => (url.get(key) ? [[key, url.get(key)]] : [])),
    ),
    pageIndex: url.has("pageIndex") ? Number(url.get("pageIndex")) : 1,
    pageSize: url.has("pageSize") ? Number(url.get("pageSize")) : 20,
    sortBy: url.get("sortBy") ?? "createdAt:desc",
  });
  const params: InvoiceQueryParams = parsed.success
    ? parsed.data
    : initialInvoiceParams;
  const search = url.get("search") ?? "";
  const debounced = useDebounce(search, 300);
  const waiting = search !== debounced;
  const query = useInvoices(
    { ...params, search: debounced },
    parsed.success && !waiting,
  );
  const change = (patch: Partial<InvoiceQueryParams>) =>
    setUrl(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(patch)) {
          if (value === undefined || value === "") next.delete(key);
          else next.set(key, String(value));
        }
        if (!Object.hasOwn(patch, "pageIndex")) next.set("pageIndex", "1");
        return next;
      },
      { replace: true },
    );
  const error = query.isError && !waiting ? getInvoiceError(query.error) : null;
  const meta = query.data
    ? invoicePaginationMeta(query.data)
    : {
        currentPage: params.pageIndex,
        itemsPerPage: params.pageSize,
        totalItems: 0,
        totalPages: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      };
  if (!canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] }))
    return (
      <ErrorState message="Only Logistics Managers can access the invoice list." />
    );
  return (
    <div className="booking-page-shell min-w-0 min-h-[calc(100svh-5rem)] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
      <div className="booking-page-enter mx-auto w-full min-w-0 max-w-[1152px] space-y-5">
        <InvoiceMockIndicator />
        <div>
          <PageHeader title="Invoices" backHref="/admin" showBack={false} />
          <p className="text-xs text-slate-500 sm:text-sm">
            View invoices, financial summaries and payment receipts.
          </p>
        </div>
        <InvoiceFilters
          params={params}
          search={search}
          onSearchChange={(search) => change({ search })}
          onChange={change}
        />
        {!parsed.success ? (
          <ErrorState message="The invoice filters or date ranges are invalid. Check or clear the affected filters, or correct the URL parameters." />
        ) : error ? (
          <ErrorState
            message={error.message}
            onRetry={error.retryable ? () => void query.refetch() : undefined}
          />
        ) : (
          <InvoiceTable
            items={query.data?.items ?? []}
            meta={meta}
            isLoading={query.isPending || query.isFetching || waiting}
            filtered={filterKeys.some((key) => Boolean(params[key]))}
            onPageChange={(pageIndex) => {
              if (!query.isFetching && !waiting) change({ pageIndex });
            }}
            onPageSizeChange={(pageSize) => change({ pageSize })}
          />
        )}
      </div>
    </div>
  );
}
