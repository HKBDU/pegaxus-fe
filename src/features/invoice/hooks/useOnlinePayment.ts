import { useMutation } from "@tanstack/react-query"
import { InvoiceServiceError, startOnlinePayment } from "@/features/invoice/services"
import type { OnlinePaymentInput, OnlinePaymentResponse } from "@/features/invoice/types"

export function useOnlinePayment() {
  return useMutation<OnlinePaymentResponse, InvoiceServiceError, OnlinePaymentInput>({
    mutationKey: ['invoice-payment', 'online-payment'],
    mutationFn: ({ invoiceId }) => startOnlinePayment(invoiceId),
    retry: false,
  })
}
