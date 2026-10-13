import { useMutation } from '@tanstack/react-query'
import { recordPayment, InvoiceServiceError } from '@/features/invoice-payment/services'
import type { RecordPaymentInput, RecordPaymentResponse } from '@/features/invoice-payment/types'

export function useRecordPayment() {
  return useMutation<RecordPaymentResponse, InvoiceServiceError, RecordPaymentInput>({
    mutationKey: ['invoice-payment', 'record-payment'],
    mutationFn: ({ invoiceId, payload }) => recordPayment(invoiceId, payload),
    retry: false,
  })
}
