import { z } from "zod";

export const transportIdSchema = z.string();
export const financialAmountSchema = z
  .number()
  .finite()
  .refine(Number.isSafeInteger, {
    message: "The server amount cannot be represented safely as whole VND.",
  });
export const financialCurrencySchema = z.literal("VND");
const timestamp = z.iso.datetime({ offset: true });
const nullableTime = timestamp.nullable();

export const financialReportSchema = z
  .object({
    serverTime: timestamp,
    financialReportId: transportIdSchema.nullable(),
    reportCode: z.string().min(1).nullable(),
    isProvisional: z.boolean(),
    isStale: z.boolean(),
    warnings: z.array(z.string()),
    transport: z.object({
      transportId: transportIdSchema,
      transportCode: z.string(),
      status: z.string(),
    }),
    booking: z.object({
      bookingId: transportIdSchema,
      bookingCode: z.string(),
    }),
    dossierTemplateId: transportIdSchema.nullable(),
    currency: financialCurrencySchema,
    totalInvoicedAmount: financialAmountSchema,
    totalPaidAmount: financialAmountSchema,
    totalEmergencyCost: financialAmountSchema,
    outstandingAmount: financialAmountSchema,
    summaryNote: z.string().nullable(),
    generatedAt: nullableTime,
    createdAt: nullableTime,
    updatedAt: nullableTime,
    reconciliation: z.object({
      hasMismatch: z.boolean(),
      items: z.array(
        z.object({
          invoiceId: transportIdSchema,
          invoiceNumber: z.string(),
          issue: z.string(),
          expectedAmount: financialAmountSchema,
          actualAmount: financialAmountSchema,
        }),
      ),
    }),
    suggestedItems: z.array(
      z.object({
        itemType: z.string(),
        description: z.string(),
        quantity: financialAmountSchema.pipe(z.number().positive()),
        suggestedPrice: financialAmountSchema.nullable(),
        referenceAmount: financialAmountSchema.nullable(),
        basis: z.record(z.string(), z.unknown()),
        sourceRefs: z.array(
          z.object({ type: z.string(), id: transportIdSchema }),
        ),
        warning: z.string().nullable(),
      }),
    ),
  })
  .superRefine((report, context) => {
    for (const key of [
      "financialReportId",
      "reportCode",
      "generatedAt",
      "createdAt",
      "updatedAt",
    ] as const) {
      if ((report[key] === null) !== report.isProvisional) {
        context.addIssue({
          code: "custom",
          path: [key],
          message:
            "Report persistence metadata does not match provisional status.",
        });
      }
    }
  });

export const financialEnvelopeSchema = z.object({
  isSuccess: z.boolean(),
  code: z.number().int(),
  message: z.string(),
  errorCode: z.string().nullish(),
  errors: z
    .array(z.object({ field: z.string(), message: z.string() }))
    .nullish(),
  value: z.unknown(),
});
export const updateFinancialNoteSchema = z.object({
  lastUpdatedAt: timestamp,
  summaryNote: z.string().max(2000, "Use at most 2,000 characters.").nullable(),
});
export type FinancialReport = z.infer<typeof financialReportSchema>;
export type UpdateFinancialNote = z.infer<typeof updateFinancialNoteSchema>;
