import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { canAccess } from "@/features/auth/access-control";
import { useAuthStore } from "@/features/auth/store";
import { ErrorState } from "@/shared/components/common";
import { invoiceIdSchema } from "@/features/invoice/schemas";
import { useBookingInvoices } from "@/features/invoice/hooks/useInvoices";
import {
  getInvoiceError,
  invoicePaginationMeta,
} from "@/features/invoice/services";
import {
  initialInvoiceParams,
  customerInvoicePath,
} from "@/features/invoice/constants";
import { InvoiceTable } from "@/features/invoice/components/InvoiceTable";
import { InvoiceMockIndicator } from "@/features/invoice/components/InvoicePresentation";

export function BookingInvoiceList({
  bookingId,
  audience,
  highlightInvoiceId,
}: {
  bookingId: string;
  audience: "manager" | "customer";
  highlightInvoiceId?: string;
}) {
  const principal = useAuthStore((state) => state.principal);
  const [params, setParams] = useState(initialInvoiceParams);
  const query = useBookingInvoices(bookingId, params, audience);
  const container = useRef<HTMLDivElement>(null);
  const loaded = Boolean(query.data) && !query.isFetching;
  useEffect(() => {
    if (!highlightInvoiceId || !loaded) return;
    const row = Array.from(
      container.current?.querySelectorAll<HTMLElement>("[data-invoice-id]") ??
        [],
    ).find((item) => item.dataset.invoiceId === highlightInvoiceId);
    const target = row ?? container.current;
    target?.scrollIntoView({ block: "nearest" });
  }, [highlightInvoiceId, loaded, params.pageIndex]);
  const allowed = canAccess(principal, {
    anyRole: [audience === "manager" ? "LOGISTICS_MANAGER" : "CUSTOMER"],
  });
  const error = query.isError ? getInvoiceError(query.error) : null;
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
  if (!allowed)
    return (
      <ErrorState message="You do not have permission to view this invoice panel." />
    );
  if (!invoiceIdSchema.safeParse(bookingId).success)
    return <ErrorState message="A booking identifier is required." />;
  return (
    <div ref={container} className="space-y-3">
      <InvoiceMockIndicator />
      {highlightInvoiceId &&
      query.data &&
      !query.data.items.some(
        (item) => item.invoiceId === highlightInvoiceId,
      ) ? (
        <p className="text-xs text-slate-500">
          The linked invoice is not on this page.{" "}
          <Link
            to={customerInvoicePath(bookingId, highlightInvoiceId)}
            className="font-medium text-primary hover:underline"
          >
            Open linked invoice
          </Link>{" "}
          or check the other pages.
        </p>
      ) : null}
      {error ? (
        <ErrorState
          message={error.message}
          onRetry={error.retryable ? () => void query.refetch() : undefined}
        />
      ) : (
        <InvoiceTable
          items={query.data?.items ?? []}
          meta={meta}
          isLoading={query.isPending || query.isFetching}
          audience={audience}
          embedded
          highlightInvoiceId={highlightInvoiceId}
          onPageChange={(pageIndex) => {
            if (!query.isFetching)
              setParams((current) => ({ ...current, pageIndex }));
          }}
          onPageSizeChange={(pageSize) =>
            setParams((current) => ({ ...current, pageSize, pageIndex: 1 }))
          }
        />
      )}
    </div>
  );
}
