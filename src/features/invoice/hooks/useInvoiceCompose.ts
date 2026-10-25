import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { invoiceService } from "@/features/invoice/services";
import type {
  CreateInvoicePayload,
  InvoiceType,
  UpdateInvoicePayload,
} from "@/features/invoice/types";
////
////
export const invoiceKeys = {
  all: ["invoice"] as const,
  detail: (invoiceId: string) =>
    [...invoiceKeys.all, "detail", invoiceId] as const,
  booking: (bookingId: string) =>
    [...invoiceKeys.all, "booking", bookingId] as const,
  suggestion: (bookingId: string, type: InvoiceType | undefined, transitDays?: number) =>
    [...invoiceKeys.all, "suggestion", bookingId, type ?? "", transitDays ?? ""] as const,
};

export function useInvoice(invoiceId: string | undefined) {
  return useQuery({
    queryKey: invoiceKeys.detail(invoiceId ?? ""),
    queryFn: () => invoiceService.getInvoice(invoiceId ?? ""),
    enabled: Boolean(invoiceId),
    // `updatedAt` goes back as lastUpdatedAt on save and issue, so never serve a stale copy.
    staleTime: 0,
  });
}

/**
 * Refresh the invoice lists, details and histories after a write. The IV1 precheck is left alone: right after a save it
 * would answer INVOICE_ALREADY_EXISTS about the draft that was just created, and its form is already closing.
 */
function refreshInvoices(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: invoiceKeys.all,
    predicate: (query) => query.queryKey[1] !== "suggestion",
  });
}

export function useInvoiceBookingContext(bookingId: string | undefined) {
  return useQuery({
    queryKey: invoiceKeys.booking(bookingId ?? ""),
    queryFn: () => invoiceService.getBookingContext(bookingId ?? ""),
    enabled: Boolean(bookingId),
  });
}

/**
 * IV1, called as soon as the manager picks a type. Its errors (R3, R4, R6, QUOTATION_REQUIRED, PENDING_EMERGENCY_COSTS)
 * are shown on the form. `transitDays` re-prices a QUOTATION; the previous answer stays on screen while it reloads.
 */
export function useInvoiceSuggestion(
  bookingId: string | undefined,
  type: InvoiceType | undefined,
  transitDays?: number,
) {
  return useQuery({
    queryKey: invoiceKeys.suggestion(bookingId ?? "", type, transitDays),
    queryFn: () =>
      invoiceService.getSuggestion(bookingId ?? "", type as InvoiceType, transitDays),
    enabled: Boolean(bookingId && type),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[3] === type ? previous : undefined,
  });
}

export function useCreateInvoice(bookingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInvoicePayload) =>
      invoiceService.createInvoice(bookingId, payload),
    onSuccess: (invoice) => {
      queryClient.setQueryData(invoiceKeys.detail(invoice.invoiceId), invoice);
      void refreshInvoices(queryClient);
    },
  });
}

export function useUpdateInvoice(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateInvoicePayload) =>
      invoiceService.updateInvoice(invoiceId, payload),
    onSuccess: (invoice) => {
      queryClient.setQueryData(invoiceKeys.detail(invoiceId), invoice);
      void refreshInvoices(queryClient);
    },
  });
}

export function useIssueInvoice(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lastUpdatedAt: string) =>
      invoiceService.issueInvoice(invoiceId, lastUpdatedAt),
    onSuccess: () => {
      void refreshInvoices(queryClient);
    },
  });
}
