import { z } from "zod"

import {
  DESCRIPTION_MAX_LENGTH,
  INVOICE_CURRENCIES,
  INVOICE_ITEM_TYPES,
  INVOICE_TYPES,
} from "@/features/invoice/constants"
import type { CreateInvoicePayload, Invoice, InvoiceItemPayload, UpdateInvoicePayload } from "@/features/invoice/types"
import { hasAtMostTwoDecimals, parseDecimal, todayIsoDate } from "@/features/invoice/utils"

/** `quantity` and `price` stay strings in the form (typing "1." must not jump) and are parsed on submit. */
export const invoiceItemFormSchema = z.object({
  invoiceItemId: z.string().optional(),
  itemType: z.enum(INVOICE_ITEM_TYPES),
  description: z.string().trim().min(1, "Description is required").max(DESCRIPTION_MAX_LENGTH, `At most ${DESCRIPTION_MAX_LENGTH} characters`),
  quantity: z.string().superRefine((value, ctx) => {
    const quantity = parseDecimal(value)
    if (Number.isNaN(quantity)) ctx.addIssue({ code: "custom", message: "Enter a number" })
    else if (quantity <= 0) ctx.addIssue({ code: "custom", message: "Must be greater than 0" })
    else if (!hasAtMostTwoDecimals(quantity)) ctx.addIssue({ code: "custom", message: "At most 2 decimals" })
  }),
  price: z.string().superRefine((value, ctx) => {
    const price = parseDecimal(value)
    if (Number.isNaN(price)) ctx.addIssue({ code: "custom", message: "Enter a number" })
    else if (price <= 0) ctx.addIssue({ code: "custom", message: "Must be greater than 0" })
    else if (!hasAtMostTwoDecimals(price)) ctx.addIssue({ code: "custom", message: "At most 2 decimals" })
  }),
  /** "" means the line covers the whole trip. */
  horseId: z.string(),
  note: z.string(),
})

export const invoiceFormSchema = z.object({
  type: z.enum(INVOICE_TYPES),
  currency: z.enum(INVOICE_CURRENCIES),
  dueDate: z
    .string()
    .min(1, "Due date is required")
    .refine((value) => value >= todayIsoDate(), "Due date cannot be before today"),
  note: z.string(),
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
    currency: invoice.currency,
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
    quantity: parseDecimal(item.quantity),
    price: parseDecimal(item.price),
    horseId: item.horseId || null,
    note: item.note.trim() || null,
  }
}

/** `payment` and `itemDate` are left out on purpose: pending P-01 to P-03, the BE ignores them. */
export function toCreatePayload(values: InvoiceFormValues): CreateInvoicePayload {
  return {
    type: values.type,
    currency: values.currency,
    dueDate: values.dueDate,
    ...(values.note.trim() ? { note: values.note.trim() } : {}),
    items: values.items.map(toItemPayload),
  }
}

export function toUpdatePayload(values: InvoiceFormValues, lastUpdatedAt: string): UpdateInvoicePayload {
  return {
    lastUpdatedAt,
    currency: values.currency,
    dueDate: values.dueDate,
    ...(values.note.trim() ? { note: values.note.trim() } : {}),
    items: values.items.map(toItemPayload),
  }
}
