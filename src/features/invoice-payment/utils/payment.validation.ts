import { z } from 'zod'
import {
  CANCELLATION_REASON_MIN_LENGTH,
  PAYMENT_CURRENCY_VALUES,
  PAYMENT_METHOD_VALUES,
  PAYMENT_TRANSACTION_REFERENCE_MAX_LENGTH,
} from '@/features/invoice-payment/constants/payment.constants'
import type { InvoiceCurrency } from '@/shared/constants/invoice'
import type { Invoice, RecordPaymentPayload } from '@/shared/types/invoice'

const paidAt = z
  .string()
  .datetime({ offset: true, message: 'Paid time must be a valid ISO timestamp.' })
  .refine((value) => new Date(value).getTime() <= Date.now(), 'Paid time cannot be in the future.')

const optionalText = (max: number) => z.string().trim().max(max).optional()

export const cancellationSchema = z.object({
  cancellationReason: z
    .string()
    .trim()
    .min(CANCELLATION_REASON_MIN_LENGTH, `Cancellation reason must be at least ${CANCELLATION_REASON_MIN_LENGTH} characters.`),
})

export const recordPaymentSchema = z.object({
  amount: z.number().finite().nonnegative(),
  currency: z.enum(PAYMENT_CURRENCY_VALUES),
  paymentMethod: z.enum(PAYMENT_METHOD_VALUES),
  transactionReference: optionalText(PAYMENT_TRANSACTION_REFERENCE_MAX_LENGTH),
  paidAt: paidAt.optional(),
  note: z.string().trim().optional(),
})

export function createRecordPaymentSchema(grandTotal: number, currency: InvoiceCurrency) {
  return recordPaymentSchema.superRefine((payload, context) => {
    if (payload.amount !== grandTotal) {
      context.addIssue({
        code: 'custom',
        path: ['amount'],
        message: 'Amount must equal the invoice grand total.',
      })
    }
    if (payload.currency !== currency) {
      context.addIssue({
        code: 'custom',
        path: ['currency'],
        message: 'Payment currency must match the invoice currency.',
      })
    }
  })
}

export function validateRecordPayment(payload: RecordPaymentPayload, invoice: Invoice) {
  return createRecordPaymentSchema(invoice.summary.grandTotal, invoice.currency).safeParse(payload)
}

export function validateCancellation(cancellationReason: string) {
  return cancellationSchema.safeParse({ cancellationReason })
}
