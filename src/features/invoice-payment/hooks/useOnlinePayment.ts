import { useMutation } from '@tanstack/react-query'
import { InvoiceServiceError, startOnlinePayment } from '@/features/invoice-payment/services'
import type { OnlinePaymentResponse } from '@/shared/types/invoice'

export type OnlinePaymentInput = {
  invoiceId: string
}

export function useOnlinePayment() {
  return useMutation<OnlinePaymentResponse, InvoiceServiceError, OnlinePaymentInput>({
    mutationKey: ['invoice-payment', 'online-payment'],
    mutationFn: ({ invoiceId }) => startOnlinePayment(invoiceId),
    retry: false,
  })
}
