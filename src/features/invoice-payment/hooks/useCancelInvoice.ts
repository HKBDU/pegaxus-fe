import { useMutation } from '@tanstack/react-query'
import { cancelInvoice, InvoiceServiceError } from '@/features/invoice-payment/services'
import type { CancelInvoicePayload, CancelInvoiceResponse } from '@/shared/types/invoice'

export type CancelInvoiceInput = {
  invoiceId: string
  payload: CancelInvoicePayload
}

export function useCancelInvoice() {
  return useMutation<CancelInvoiceResponse, InvoiceServiceError, CancelInvoiceInput>({
    mutationKey: ['invoice-payment', 'cancel-invoice'],
    mutationFn: ({ invoiceId, payload }) => cancelInvoice(invoiceId, payload),
    retry: false,
  })
}
