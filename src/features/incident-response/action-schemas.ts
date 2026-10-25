import { z } from "zod";
import { emergencyCostFormSchema, type EmergencyCostDetail } from "./schemas";

const timestamp = z.iso.datetime({ offset: true });
const reason = z
  .string()
  .trim()
  .min(10, "Enter at least 10 characters after trimming.")
  .max(2000);
const positiveWholeVnd = z
  .number()
  .positive()
  .refine(Number.isSafeInteger, "Enter a positive safe whole number of VND.");

export const emergencyCostCancelSchema = z.object({
  lastUpdatedAt: timestamp,
  cancellationReason: reason,
});

export function createEmergencyCostDecisionSchema(requestedAmount: number) {
  return z
    .discriminatedUnion("decision", [
      z
        .object({
          lastUpdatedAt: timestamp,
          decision: z.literal("APPROVE"),
          approvedAmount: positiveWholeVnd,
          decisionReason: z.string().trim().max(2000).optional(),
        })
        .strict(),
      z
        .object({
          lastUpdatedAt: timestamp,
          decision: z.literal("REJECT"),
          decisionReason: reason,
        })
        .strict(),
    ])
    .superRefine((data, ctx) => {
      if (data.decision !== "APPROVE") return;
      if (data.approvedAmount > requestedAmount)
        ctx.addIssue({
          code: "custom",
          path: ["approvedAmount"],
          message: "Approved amount must not exceed the requested amount.",
        });
      if (
        data.approvedAmount < requestedAmount &&
        (data.decisionReason?.length ?? 0) < 10
      )
        ctx.addIssue({
          code: "custom",
          path: ["decisionReason"],
          message: "Explain a reduced approval in at least 10 characters.",
        });
    });
}

export function createEmergencyCostDecisionFormSchema(
  snapshot: Pick<EmergencyCostDetail, "requestedAmount" | "updatedAt">,
) {
  const wireSchema = createEmergencyCostDecisionSchema(
    snapshot.requestedAmount,
  );
  return z
    .object({
      decision: z.enum(["APPROVE", "REJECT"]),
      approvedAmount: z.string(),
      decisionReason: z.string(),
    })
    .superRefine((values, ctx) => {
      const amount =
        values.decision === "APPROVE"
          ? emergencyCostFormSchema.shape.requestedAmount.safeParse(
              values.approvedAmount,
            )
          : null;
      if (amount && !amount.success) {
        ctx.addIssue({
          code: "custom",
          path: ["approvedAmount"],
          message:
            amount.error.issues[0]?.message ??
            "Enter a positive whole number of VND.",
        });
        return;
      }
      const result = wireSchema.safeParse({
        lastUpdatedAt: snapshot.updatedAt,
        decision: values.decision,
        decisionReason: values.decisionReason,
        ...(amount?.success ? { approvedAmount: amount.data } : {}),
      });
      if (!result.success)
        result.error.issues.forEach((issue) =>
          ctx.addIssue({
            code: "custom",
            path: issue.path,
            message: issue.message,
          }),
        );
    });
}

export type EmergencyCostCancelInput = z.infer<
  typeof emergencyCostCancelSchema
>;
export type EmergencyCostDecisionInput = z.infer<
  ReturnType<typeof createEmergencyCostDecisionSchema>
>;
