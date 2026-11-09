import { z } from "zod"
import {
  ALL_TIERS_VALUE,
  PRICE_LIST_ITEM_LIMITS,
  PRICE_LIST_ITEM_TYPES,
  PRICE_LIST_TIERS,
  PRICE_LIST_UNITS,
} from "@/features/price-list/constants"
import type {
  CreatePriceListItemPayload,
  PriceListDetail,
  PriceListItem,
  PriceListItemFormMode,
  UpdatePriceListItemPayload,
} from "@/features/price-list/types"

/* ---------- Responses ---------- */

/**
 * `updatedAt` stays a plain string on purpose (A-01): turning it into a Date drops the microseconds and every save would then be a 409.
 * The rates are `z.number()` without `.int()` because they can be `37.5`; only the price is a whole number (A-04).
 */
export const priceListItemSchema: z.ZodType<PriceListItem> = z.object({
  priceListItemId: z.string(),
  priceListId: z.string(),
  itemCode: z.string(),
  itemName: z.string(),
  itemType: z.enum(PRICE_LIST_ITEM_TYPES),
  unit: z.enum(PRICE_LIST_UNITS),
  unitPrice: z.number().int(),
  vehicleTier: z.enum(PRICE_LIST_TIERS).nullable(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const priceListDetailSchema: z.ZodType<PriceListDetail> = z.object({
  priceListId: z.string(),
  name: z.string(),
  currency: z.string(),
  taxRate: z.number(),
  depositRate: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdByAccountId: z.string().nullable(),
  updatedByAccountId: z.string().nullable(),
  items: z.array(priceListItemSchema),
})


/* ---------- Item form ---------- */

const WHOLE_NUMBER = /^\d+$/

/** Digits typed in a text field: `undefined` when empty, `NaN` when it is not a whole number. */
export function parseWholeNumber(value: string) {
  const text = value.trim()
  if (!text) return undefined
  return WHOLE_NUMBER.test(text) ? Number(text) : Number.NaN
}

const itemFormShape = {
  itemCode: z.string(),
  itemName: z
    .string()
    .trim()
    .min(1, "Item name is required")
    .max(PRICE_LIST_ITEM_LIMITS.itemNameMax, `Item name must be at most ${PRICE_LIST_ITEM_LIMITS.itemNameMax} characters`),
  itemType: z.enum(PRICE_LIST_ITEM_TYPES, { error: "Select an item type" }),
  unit: z.enum(PRICE_LIST_UNITS, { error: "Select a unit" }),
  unitPrice: z.string().superRefine((value, ctx) => {
    const price = parseWholeNumber(value)
    if (price === undefined) ctx.addIssue({ code: "custom", message: "Unit price is required" })
    else if (Number.isNaN(price)) ctx.addIssue({ code: "custom", message: "Unit price must be a whole number" })
    else if (price < PRICE_LIST_ITEM_LIMITS.unitPriceMin) ctx.addIssue({ code: "custom", message: "Unit price must be greater than 0" })
    else if (price > PRICE_LIST_ITEM_LIMITS.unitPriceMax) ctx.addIssue({ code: "custom", message: "Unit price must be at most 10,000,000,000" })
  }),
  vehicleTier: z.enum([ALL_TIERS_VALUE, ...PRICE_LIST_TIERS]),
  sortOrder: z.string().superRefine((value, ctx) => {
    const order = parseWholeNumber(value)
    if (order === undefined) return
    if (Number.isNaN(order)) ctx.addIssue({ code: "custom", message: "Sort order must be a whole number" })
    else if (order > PRICE_LIST_ITEM_LIMITS.sortOrderMax) ctx.addIssue({ code: "custom", message: "Sort order must be between 0 and 1,000,000" })
  }),
}

const createItemFormSchema = z.object({
  ...itemFormShape,
  itemCode: z
    .string()
    .trim()
    .min(1, "Item code is required")
    .regex(PRICE_LIST_ITEM_LIMITS.itemCodePattern, "Use 1 to 50 characters: A-Z, 0-9 and _"),
})

/** The code is read-only when editing, so it is not validated (and not sent). */
const editItemFormSchema = z.object(itemFormShape)

export type PriceListItemFormValues = z.infer<typeof createItemFormSchema>

export function getPriceListItemFormSchema(mode: PriceListItemFormMode) {
  return mode === "create" ? createItemFormSchema : editItemFormSchema
}

export const emptyPriceListItemFormValues: PriceListItemFormValues = {
  itemCode: "",
  itemName: "",
  itemType: "" as PriceListItemFormValues["itemType"],
  unit: "" as PriceListItemFormValues["unit"],
  unitPrice: "",
  vehicleTier: ALL_TIERS_VALUE,
  sortOrder: "",
}

export function toItemFormValues(item?: PriceListItem): PriceListItemFormValues {
  if (!item) return emptyPriceListItemFormValues
  return {
    itemCode: item.itemCode,
    itemName: item.itemName,
    itemType: item.itemType,
    unit: item.unit,
    unitPrice: String(item.unitPrice),
    vehicleTier: item.vehicleTier ?? ALL_TIERS_VALUE,
    sortOrder: String(item.sortOrder),
  }
}

function toTier(value: PriceListItemFormValues["vehicleTier"]) {
  return value === ALL_TIERS_VALUE ? null : value
}

/** Blank sort order = `null`: the BE puts a new line last. */
function toSortOrder(value: string) {
  const order = parseWholeNumber(value)
  return order === undefined || Number.isNaN(order) ? null : order
}

export function toCreateItemPayload(values: PriceListItemFormValues): CreatePriceListItemPayload {
  return {
    itemCode: values.itemCode.trim().toUpperCase(),
    itemName: values.itemName.trim(),
    itemType: values.itemType,
    unit: values.unit,
    unitPrice: Number(parseWholeNumber(values.unitPrice)),
    vehicleTier: toTier(values.vehicleTier),
    sortOrder: toSortOrder(values.sortOrder),
  }
}

/** `lastUpdatedAt` is the raw `updatedAt` of the line (A-01, A-02). Blank sort order on edit means "keep it". */
export function toUpdateItemPayload(values: PriceListItemFormValues, lastUpdatedAt: string): UpdatePriceListItemPayload {
  const { itemCode: _itemCode, ...rest } = toCreateItemPayload(values)
  return { ...rest, lastUpdatedAt }
}
