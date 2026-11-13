import { z } from "zod";
import { PRICE_LIST_HEADER_LIMITS } from "./header.constants";

const name = z
  .string()
  .trim()
  .min(1, "Enter a price list name.")
  .max(PRICE_LIST_HEADER_LIMITS.nameMax);
const currency = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{3}$/, "Enter a three-letter currency code.")
  .transform((value) => value.toUpperCase());
const rate = z
  .number()
  .min(PRICE_LIST_HEADER_LIMITS.rateMin)
  .max(PRICE_LIST_HEADER_LIMITS.rateMax)
  .multipleOf(0.01);
const formRate = z
  .string()
  .trim()
  .min(1, "Enter a percentage.")
  .regex(/^\d+(?:\.\d{1,2})?$/, "Use a number with at most two decimal places.")
  .refine(
    (value) => Number(value) >= 0 && Number(value) <= 100,
    "Enter a percentage from 0 to 100.",
  );

export const priceListHeaderFormSchema = z.object({
  name,
  currency,
  taxRate: formRate,
  depositRate: formRate,
});
const headerRequestShape = { name, currency, taxRate: rate, depositRate: rate };
export const createPriceListHeaderSchema = z.object(headerRequestShape);
export const updatePriceListHeaderSchema = z.object({
  ...headerRequestShape,
  lastUpdatedAt: z.string().min(1),
});

export const priceListHeaderSchema = z.object({
  priceListId: z.string().min(1),
  name: z.string(),
  currency: z.string(),
  taxRate: rate,
  depositRate: rate,
  isActive: z.boolean(),
  // Version tokens are opaque: never parse, trim or serialize through Date.
  updatedAt: z.string().min(1),
});
export const priceListHeaderEnvelopeSchema = z.object({
  isSuccess: z.boolean(),
  code: z.number().int(),
  message: z.string(),
  errorCode: z.string().nullish(),
  errors: z
    .array(z.object({ field: z.string(), message: z.string() }))
    .nullish(),
  value: z.unknown(),
});

export type PriceListHeader = z.infer<typeof priceListHeaderSchema>;
export type PriceListEditableHeader = Omit<PriceListHeader, "isActive"> & {
  isActive?: boolean;
};
export type PriceListHeaderFormValues = z.input<
  typeof priceListHeaderFormSchema
>;
export type CreatePriceListHeaderInput = z.input<
  typeof createPriceListHeaderSchema
>;
export type UpdatePriceListHeaderInput = z.input<
  typeof updatePriceListHeaderSchema
>;

export function priceListHeaderPayload(
  values: PriceListHeaderFormValues,
): CreatePriceListHeaderInput {
  const parsed = priceListHeaderFormSchema.parse(values);
  return createPriceListHeaderSchema.parse({
    ...parsed,
    taxRate: Number(parsed.taxRate),
    depositRate: Number(parsed.depositRate),
  });
}
