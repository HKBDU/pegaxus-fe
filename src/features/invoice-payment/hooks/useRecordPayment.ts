import { useMutation } from '@tanstack/react-query'
import { recordPayment, InvoiceServiceError } from '@/features/invoice-payment/services'
import type { RecordPaymentPayload, RecordPaymentResponse } from '@/shared/types/invoice'

export type RecordPaymentInput = {
  invoiceId: string
  payload: RecordPaymentPayload
}

export function useRecordPayment() {
  return useMutation<RecordPaymentResponse, InvoiceServiceError, RecordPaymentInput>({
    mutationKey: ['invoice-payment', 'record-payment'],
    mutationFn: ({ invoiceId, payload }) => recordPayment(invoiceId, payload),
    retry: false,
  })
}
