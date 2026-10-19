import { z } from "zod"
import { invoiceTypes, invoiceStatuses, invoiceHistoryTypes, invoiceItemTypes, invoiceActions, receiptStatuses, paymentMethods, invoiceSorts, DESCRIPTION_MAX_LENGTH, INVOICE_ITEM_TYPE, INVOICE_TYPE } from "@/features/invoice/constants"
import type { CreateInvoicePayload, Invoice, InvoiceItemPayload, UpdateInvoicePayload } from "@/features/invoice/types"
import { parseWholeNumber, todayIsoDate } from "@/features/invoice/utils"
import { VALIDATION_LIMITS } from "@/shared/constants/validation-limits"

export const invoiceIdSchema = z.string();
const date = z.iso.date();
const timestamp = z.iso.datetime({ offset: true });
const text = z.string().nullable();
// The app is VND-only: an older row stored in another currency is still read, and shown as VND.
const currency = z.string().transform((): "VND" => "VND");
const amount = z.number().finite();
export const invoiceTypeSchema = z.enum(invoiceTypes);
export const invoiceStatusSchema = z.enum(invoiceStatuses);
export const invoiceSortSchema = z.enum(invoiceSorts);
export const invoiceHistoryTypeSchema = z.enum(invoiceHistoryTypes);
export const invoiceStatusHistoryEventSchema = z.object({
  historyId: invoiceIdSchema,
  type: invoiceHistoryTypeSchema,
  previousStatus: invoiceStatusSchema.nullable(),
  newStatus: invoiceStatusSchema,
  reason: text,
  changedBy: z.object({
    accountId: invoiceIdSchema.nullable(),
    fullName: z.string(),
    role: text,
  }),
  changedAt: timestamp,
});
export const invoiceStatusHistorySchema = z.array(
  invoiceStatusHistoryEventSchema,
);
export const bookingInvoiceQuerySchema = z.object({
  pageIndex: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  type: invoiceTypeSchema.optional(),
  status: invoiceStatusSchema.optional(),
  sortBy: invoiceSortSchema,
});
export const invoiceQuerySchema = bookingInvoiceQuerySchema
  .extend({
    search: z
      .string()
      .trim()
      .transform((value) => value || undefined)
      .optional(),
    bookingId: invoiceIdSchema.optional(),
    transportPlanId: invoiceIdSchema.optional(),
    issuedFrom: date.optional(),
    issuedTo: date.optional(),
    dueFrom: date.optional(),
    dueTo: date.optional(),
  })
  .superRefine((value, ctx) => {
    for (const [from, to] of [
      ["issuedFrom", "issuedTo"],
      ["dueFrom", "dueTo"],
    ] as const) {
      if (value[from] && value[to] && value[from] > value[to])
        ctx.addIssue({
          code: "custom",
          path: [to],
          message: "End date must not precede start date.",
        });
    }
  });
export const invoiceListItemSchema = z.object({
  invoiceId: invoiceIdSchema,
  invoiceNumber: z.string(),
  type: invoiceTypeSchema,
  status: invoiceStatusSchema,
  bookingId: invoiceIdSchema,
  bookingCode: z.string(),
  transportPlanId: invoiceIdSchema.nullable(),
  customerName: z.string(),
  totalAmount: amount,
  currency,
  dueDate: date.nullable(),
  issuedAt: timestamp.nullable(),
  paidAt: timestamp.nullable(),
  createdAt: timestamp,
  updatedAt: timestamp,
});
export const invoicePageSchema = z.object({
  items: z.array(invoiceListItemSchema),
  pageIndex: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});
export const invoiceItemSchema = z.object({
  invoiceItemId: invoiceIdSchema.nullable(),
  itemType: z.enum(invoiceItemTypes),
  description: z.string(),
  quantity: amount,
  price: amount,
  total: amount,
  horse: z
    .object({ horseId: invoiceIdSchema, horseName: z.string() })
    .nullable(),
  isDepositDeduction: z.boolean(),
  note: text,
  emergencyCostRequestId: invoiceIdSchema.nullable(),
  itemDate: date.nullish(),
});
export const invoiceDetailSchema = z.object({
  invoiceId: invoiceIdSchema,
  invoiceNumber: z.string(),
  type: invoiceTypeSchema,
  status: invoiceStatusSchema,
  isPaymentRequired: z.boolean(),
  invoiceDate: date,
  dueDate: date.nullable(),
  currency,
  note: text,
  // P-01/P-02 are not usable yet; never substitute Receipt.paymentMethod here.
  payment: z
    .object({ method: z.string(), qrCodeUrl: z.string().nullable() })
    .nullable(),
  customer: z.object({
    customerId: invoiceIdSchema,
    customerCode: z.string(),
    name: z.string(),
    email: z.string(),
    phone: text,
    address: text,
  }),
  contactPerson: z.object({ name: z.string(), email: z.string(), phone: text }),
  booking: z.object({
    bookingId: invoiceIdSchema,
    bookingCode: z.string(),
    status: z.string(),
    requestedDepartureDate: date,
    originAddress: z.string(),
    originCountry: z.string(),
    destinationAddress: z.string(),
    destinationCountry: z.string(),
  }),
  transport: z
    .object({
      transportId: invoiceIdSchema,
      transportCode: z.string(),
      status: z.string(),
    })
    .nullable(),
  transportPlan: z
    .object({
      transportPlanId: invoiceIdSchema,
      planCode: z.string(),
      status: z.string(),
    })
    .nullable(),
  items: z.array(invoiceItemSchema),
  summary: z.object({
    subtotal: amount,
    discount: amount,
    tax: amount,
    taxRatePercent: amount,
    depositDeduction: amount,
    grandTotal: amount,
  }),
  receipts: z.array(
    z.object({
      receiptId: invoiceIdSchema,
      receiptCode: z.string(),
      amount,
      currency,
      paymentMethod: z.enum(paymentMethods),
      status: z.enum(receiptStatuses),
      transactionReference: text,
      paidAt: timestamp.nullable(),
      confirmedAt: timestamp.nullable(),
      note: text,
      recordedBy: z
        .object({ accountId: invoiceIdSchema, fullName: z.string() })
        .nullable(),
    }),
  ),
  availableActions: z.array(z.enum(invoiceActions)),
  issuedAt: timestamp.nullable(),
  paidAt: timestamp.nullable(),
  cancelledAt: timestamp.nullable(),
  cancellationReason: text,
  createdAt: timestamp,
  updatedAt: timestamp,
});
export const invoiceEnvelopeSchema = z.object({
  isSuccess: z.boolean(),
  code: z.number(),
  message: z.string().nullish(),
  value: z.unknown(),
  errorCode: z.string().nullish(),
  errors: z
    .array(z.object({ field: z.string(), message: z.string() }))
    .nullish(),
});

// ---- from compose/schemas.ts ----
/** `quantity` and `price` stay strings in the form (typing "1." must not jump) and are parsed on submit. */
export const invoiceItemFormSchema = z.object({
  invoiceItemId: z.string().optional(),
  itemType: z.enum(INVOICE_ITEM_TYPE),
  description: z.string().trim().min(1, "Description is required").max(DESCRIPTION_MAX_LENGTH, `At most ${DESCRIPTION_MAX_LENGTH} characters`),
  quantity: z.string().superRefine((value, ctx) => {
    const quantity = parseWholeNumber(value)
    if (Number.isNaN(quantity)) ctx.addIssue({ code: "custom", message: "Enter a whole number" })
    else if (quantity <= 0) ctx.addIssue({ code: "custom", message: "Must be greater than 0" })
    else if (quantity > 5000) ctx.addIssue({ code: "custom", message: "Quantity must be at most 5,000" })
    else if (!Number.isSafeInteger(quantity)) ctx.addIssue({ code: "custom", message: "Number is too large" })
  }),
  price: z.string().superRefine((value, ctx) => {
    const price = parseWholeNumber(value)
    if (Number.isNaN(price)) ctx.addIssue({ code: "custom", message: "Enter a whole amount in VND (no decimals)" })
    else if (price <= 0) ctx.addIssue({ code: "custom", message: "Must be greater than 0" })
    else if (!Number.isSafeInteger(price)) ctx.addIssue({ code: "custom", message: "Amount is too large" })
  }),
  /** "" means the line covers the whole trip. */
  horseId: z.string(),
  note: z.string(),
})

function maxFutureDateIso(years = VALIDATION_LIMITS.dateWindowYears): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + years)
  return d.toISOString().slice(0, 10)
}

export const invoiceFormSchema = z.object({
  type: z.enum(INVOICE_TYPE),
  dueDate: z
    .string()
    .min(1, "Due date is required")
    .refine((value) => value >= todayIsoDate(), "Due date cannot be before today")
    .refine((value) => value <= maxFutureDateIso(), `Due date must be within ${VALIDATION_LIMITS.dateWindowYears} years from today`),
  note: z.string().max(VALIDATION_LIMITS.noteMaxLength, `Note must be at most ${VALIDATION_LIMITS.noteMaxLength} characters`),
  items: z.array(invoiceItemFormSchema),
})

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>
export type InvoiceItemFormValues = z.infer<typeof invoiceItemFormSchema>

export function emptyItem(): InvoiceItemFormValues {
  return { itemType: "TRANSPORT_FEE", description: "", quantity: "1", price: "", horseId: "", note: "" }
}

/** Fills the form from a saved draft (edit mode). The deposit deduction lines are not form rows, the server regenerates them. */
export function invoiceToFormValues(invoice: Invoice): InvoiceFormValues {
  return {
    type: invoice.type,
    dueDate: invoice.dueDate,
    note: invoice.note ?? "",
    items: invoice.items
      .filter((item) => !item.isDepositDeduction)
      .map((item) => ({
        invoiceItemId: item.invoiceItemId ?? undefined,
        itemType: item.itemType,
        description: item.description,
        quantity: String(item.quantity),
        price: String(item.price),
        horseId: item.horse?.horseId ?? "",
        note: item.note ?? "",
      })),
  }
}

function toItemPayload(item: InvoiceItemFormValues): InvoiceItemPayload {
  return {
    ...(item.invoiceItemId ? { invoiceItemId: item.invoiceItemId } : {}),
    itemType: item.itemType,
    description: item.description.trim(),
    quantity: parseWholeNumber(item.quantity),
    price: parseWholeNumber(item.price),
    horseId: item.horseId || null,
    note: item.note.trim() || null,
  }
}

/** `payment` and `itemDate` are left out on purpose: pending P-01 to P-03, the BE ignores them. */
export function toCreatePayload(values: InvoiceFormValues): CreateInvoicePayload {
  return {
    type: values.type,
    dueDate: values.dueDate,
    ...(values.note.trim() ? { note: values.note.trim() } : {}),
    items: values.items.map(toItemPayload),
  }
}

export function toUpdatePayload(values: InvoiceFormValues, lastUpdatedAt: string): UpdateInvoicePayload {
  return {
    lastUpdatedAt,
    dueDate: values.dueDate,
    ...(values.note.trim() ? { note: values.note.trim() } : {}),
    items: values.items.map(toItemPayload),
  }
}
