import { useQuery } from "@tanstack/react-query"
import { canAccess } from "@/features/auth/access-control"
import { useAuthStore } from "@/features/auth/store"
import { invoiceViewService, getInvoiceError } from "../services"
import { invoiceIdSchema } from "../schemas"
import { isFlow6MockMode } from "../source"
import type { InvoiceQueryParams, BookingInvoiceQueryParams } from "../types"

function useInvoiceScope() {
  const principal = useAuthStore(state => state.principal)
  const version = useAuthStore(state => state.sessionVersion)
  const customerId = useAuthStore(state => state.user?.customerId)
  return { principal, scope: [isFlow6MockMode() ? "mock" : "real", principal?.id, principal?.roles, customerId, version] as const }
}
const retry = (count: number, error: Error) => count < 1 && getInvoiceError(error).retryable
export function useInvoices(params: InvoiceQueryParams, enabled = true) {
  const { principal, scope } = useInvoiceScope()
  return useQuery({ queryKey: ["invoice-view", ...scope, "list", params], queryFn: ({ signal }) => invoiceViewService.list(params, signal),
    enabled: enabled && canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] }), retry })
}
export function useBookingInvoices(bookingId: string, params: BookingInvoiceQueryParams, audience: "manager" | "customer") {
  const { principal, scope } = useInvoiceScope()
  return useQuery({ queryKey: ["invoice-view", ...scope, "booking", bookingId, params], queryFn: ({ signal }) => invoiceViewService.bookingList(bookingId, params, signal),
    enabled: invoiceIdSchema.safeParse(bookingId).success && canAccess(principal, { anyRole: [audience === "manager" ? "LOGISTICS_MANAGER" : "CUSTOMER"] }), retry })
}
export function useInvoice(invoiceId: string, enabled = true) {
  const { principal, scope } = useInvoiceScope()
  return useQuery({ queryKey: ["invoice-view", ...scope, "detail", invoiceId], queryFn: ({ signal }) => invoiceViewService.detail(invoiceId, signal),
    enabled: enabled && invoiceIdSchema.safeParse(invoiceId).success && canAccess(principal, { anyRole: ["LOGISTICS_MANAGER", "CUSTOMER"] }), retry })
}
