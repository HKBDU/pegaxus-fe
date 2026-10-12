export type {
  CancelInvoicePayload,
  CancelInvoiceResponse,
  Invoice,
  OnlinePaymentResponse,
  RecordPaymentPayload,
  RecordPaymentResponse,
} from '@/shared/types/invoice'

import type {
  CancelInvoicePayload,
  CancelInvoiceResponse,
  Invoice,
  RecordPaymentResponse,
  RecordPaymentPayload,
} from '@/shared/types/invoice'
import { PAYMENT_ERROR_CODES } from './constants/payment.constants'

export type CancelInvoiceInput = {
  invoiceId: string
  payload: CancelInvoicePayload
}

export type OnlinePaymentInput = {
  invoiceId: string
}

export type RecordPaymentInput = {
  invoiceId: string
  payload: RecordPaymentPayload
}

export type RecordPaymentDialogProps = {
  invoice: Invoice
  onRecorded: (response: RecordPaymentResponse) => void
}

export type PayNowButtonProps = {
  invoice: Invoice
}

export type CancelInvoiceDialogProps = {
  invoice: Invoice
  onCancelled: (response: CancelInvoiceResponse) => void
}

export type PaymentErrorCode = (typeof PAYMENT_ERROR_CODES)[keyof typeof PAYMENT_ERROR_CODES]

export type PaymentErrorState = {
  errorCode?: string
  message: string
  retryable: boolean
}
