import {
  PAYMENT_ERROR_CODES,
  type PaymentErrorCode,
} from '@/features/invoice-payment/constants/payment.constants'

const PAYMENT_ERROR_MESSAGES: Record<PaymentErrorCode, string> = {
  PARTIAL_PAYMENT_NOT_SUPPORTED: 'Only full payment of the invoice total is accepted.',
  CURRENCY_MISMATCH: 'Payment currency must match the invoice currency.',
  UNPAYABLE_INVOICE_TYPE: 'This invoice type cannot be paid.',
  INVALID_INVOICE_STATUS: 'This invoice cannot be paid in its current status.',
  INVOICE_HAS_PAYMENT: 'This invoice has a confirmed payment. Contact accounting for a refund process.',
  PAYMENT_IN_PROGRESS: 'A payment for this invoice is being processed.',
  VALIDATION_ERROR: 'Check the payment details and try again.',
  PAYMENT_GATEWAY_ERROR: 'Payment gateway is unavailable. Please try again later.',
}

export type PaymentErrorState = {
  errorCode?: string
  message: string
  retryable: boolean
}

export function getPaymentErrorMessage(errorCode?: string, fallback?: string) {
  return (errorCode && PAYMENT_ERROR_MESSAGES[errorCode as PaymentErrorCode]) ?? fallback ?? 'Payment request failed.'
}

export function mapPaymentError(error: unknown): PaymentErrorState {
  const candidate = error as { errorCode?: string; message?: string }
  const errorCode = candidate?.errorCode
  return {
    errorCode,
    message: getPaymentErrorMessage(errorCode, candidate?.message),
    retryable: errorCode === PAYMENT_ERROR_CODES.PAYMENT_GATEWAY_ERROR,
  }
}
