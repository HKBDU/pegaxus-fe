import { useMutation } from "@tanstack/react-query"
import { cancelInvoice, InvoiceServiceError } from "@/features/invoice/services"
import type { CancelInvoiceInput, CancelInvoiceResponse } from "@/features/invoice/types"

export function useCancelInvoice() {
  return useMutation<CancelInvoiceResponse, InvoiceServiceError, CancelInvoiceInput>({
    mutationKey: ['invoice-payment', 'cancel-invoice'],
    mutationFn: ({ invoiceId, payload }) => cancelInvoice(invoiceId, payload),
    retry: false,
  })
}
