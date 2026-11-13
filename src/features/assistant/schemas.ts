import { z } from "zod"

const guidSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
export const assistantMessageSchema = z.object({
  role: z.enum(["user", "model"]),
  content: z.string().trim().min(1).max(1000),
})
export const assistantRequestSchema = z.object({
  messages: z.array(assistantMessageSchema).min(1).max(20),
  bookingId: guidSchema.optional(),
})
const assistantReferenceSchema = z.object({
  type: z.enum(["booking", "dossier", "tracking"]),
  id: guidSchema,
  label: z.string(),
  updatedAt: z.string().nullable().optional(),
  bookingId: guidSchema.nullable().optional(),
})
export const assistantReplySchema = z.object({
  reply: z.string(),
  references: z.unknown().optional().transform((value) => {
    if (!Array.isArray(value)) return []
    return value
      .flatMap((item) => {
        const reference = assistantReferenceSchema.safeParse(item)
        return reference.success ? [reference.data] : []
      })
      .slice(0, 3)
  }),
})
