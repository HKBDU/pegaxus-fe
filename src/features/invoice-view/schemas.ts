import { z } from "zod"
import { invoiceTypes, invoiceStatuses, invoiceItemTypes, invoiceActions, receiptStatuses, paymentMethods, invoiceSorts } from "./constants"

export const invoiceIdSchema = z.string().trim().min(1)
const date = z.iso.date()
const timestamp = z.iso.datetime({ offset: true })
const text = z.string().nullable()
const currency = z.enum(["EUR", "VND"])
const amount = z.number().finite()
export const invoiceTypeSchema = z.enum(invoiceTypes)
export const invoiceStatusSchema = z.enum(invoiceStatuses)
export const invoiceSortSchema = z.enum(invoiceSorts)
export const bookingInvoiceQuerySchema = z.object({
  pageIndex: z.number().int().positive(), pageSize: z.number().int().positive(),
  type: invoiceTypeSchema.optional(), status: invoiceStatusSchema.optional(), sortBy: invoiceSortSchema,
})
export const invoiceQuerySchema = bookingInvoiceQuerySchema.extend({
  search: z.string().trim().transform((value) => value || undefined).optional(),
  bookingId: invoiceIdSchema.optional(), transportPlanId: invoiceIdSchema.optional(),
  issuedFrom: date.optional(), issuedTo: date.optional(), dueFrom: date.optional(), dueTo: date.optional(),
}).superRefine((value, ctx) => {
  for (const [from, to] of [["issuedFrom", "issuedTo"], ["dueFrom", "dueTo"]] as const) {
    if (value[from] && value[to] && value[from] > value[to]) ctx.addIssue({ code: "custom", path: [to], message: "End date must not precede start date." })
  }
})
export const invoiceListItemSchema = z.object({
  invoiceId: invoiceIdSchema, invoiceNumber: z.string(), type: invoiceTypeSchema, status: invoiceStatusSchema,
  bookingId: invoiceIdSchema, bookingCode: z.string(), transportPlanId: invoiceIdSchema.nullable(), customerName: z.string(),
  totalAmount: amount, currency, dueDate: date, issuedAt: timestamp.nullable(), paidAt: timestamp.nullable(), createdAt: timestamp, updatedAt: timestamp,
})
export const invoicePageSchema = z.object({
  items: z.array(invoiceListItemSchema), pageIndex: z.number().int().positive(), pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative(),
})
export const invoiceItemSchema = z.object({
  invoiceItemId: invoiceIdSchema.nullable(), itemType: z.enum(invoiceItemTypes), description: z.string(),
  quantity: amount, price: amount, total: amount,
  horse: z.object({ horseId: invoiceIdSchema, horseName: z.string() }).nullable(),
  isDepositDeduction: z.boolean(), note: text, emergencyCostRequestId: invoiceIdSchema.nullable(),
  itemDate: date.nullish(),
})
export const invoiceDetailSchema = z.object({
  invoiceId: invoiceIdSchema, invoiceNumber: z.string(), type: invoiceTypeSchema, status: invoiceStatusSchema,
  isPaymentRequired: z.boolean(), invoiceDate: date, dueDate: date, currency, note: text,
  // P-01/P-02 are not usable yet; never substitute Receipt.paymentMethod here.
  payment: z.record(z.string(), z.unknown()).nullable(),
  customer: z.object({ customerId: invoiceIdSchema, customerCode: z.string(), name: z.string(), email: z.string(), phone: text, address: text }),
  contactPerson: z.object({ name: z.string(), email: z.string(), phone: text }),
  booking: z.object({ bookingId: invoiceIdSchema, bookingCode: z.string(), status: z.string(), requestedDepartureDate: date,
    originAddress: z.string(), originCountry: z.string(), destinationAddress: z.string(), destinationCountry: z.string() }),
  transport: z.object({ transportId: invoiceIdSchema, transportCode: z.string(), status: z.string() }).nullable(),
  transportPlan: z.object({ transportPlanId: invoiceIdSchema, planCode: z.string(), status: z.string() }).nullable(),
  items: z.array(invoiceItemSchema),
  summary: z.object({ subtotal: amount, discount: amount, tax: amount, taxRatePercent: amount, depositDeduction: amount, grandTotal: amount }),
  receipts: z.array(z.object({ receiptId: invoiceIdSchema, receiptCode: z.string(), amount, currency, paymentMethod: z.enum(paymentMethods), status: z.enum(receiptStatuses),
    transactionReference: text, paidAt: timestamp.nullable(), confirmedAt: timestamp.nullable(), note: text,
    recordedBy: z.object({ accountId: invoiceIdSchema, fullName: z.string() }).nullable() })),
  availableActions: z.array(z.enum(invoiceActions)),
  issuedAt: timestamp.nullable(), paidAt: timestamp.nullable(), cancelledAt: timestamp.nullable(), cancellationReason: text,
  createdAt: timestamp, updatedAt: timestamp,
})
export const invoiceEnvelopeSchema = z.object({
  isSuccess: z.boolean(), code: z.number(), message: z.string().nullish(), value: z.unknown(),
  errorCode: z.string().nullish(), errors: z.array(z.object({ field: z.string(), message: z.string() })).nullish(),
})
