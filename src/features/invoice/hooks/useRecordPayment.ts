import { useMutation, useQueryClient } from "@tanstack/react-query"
import { recordPayment, InvoiceServiceError } from "@/features/invoice/services"
import type { RecordPaymentInput, RecordPaymentResponse } from "@/features/invoice/types"

// A recorded payment moves more than the invoice: the booking/transport plan flip to their paid
// state and Phase-1 personnel assignment opens. Refresh those caches so the Personnel tab shows
// up without a manual reload (literal keys: the invoice feature does not import the other features).
const PAYMENT_AFFECTED_QUERY_KEYS = [
  ["invoice"],
  ["transport-plans"],
  ["approved-bookings"],
  ["bookings"],
  ["personnel"],
] as const

export function useRecordPayment() {
  const queryClient = useQueryClient()
  return useMutation<RecordPaymentResponse, InvoiceServiceError, RecordPaymentInput>({
    mutationKey: ['invoice-payment', 'record-payment'],
    mutationFn: ({ invoiceId, payload }) => recordPayment(invoiceId, payload),
    retry: false,
    onSuccess: () =>
      Promise.all(PAYMENT_AFFECTED_QUERY_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  })
}
