import { describe, expect, it } from "vitest"

import { isCurrentlyRejected } from "@/features/route-plan/legal-blocks"
import { legalReviewSchema } from "@/features/route-plan/schemas"

const backupId = "8d8f7a2e-3c4b-4e1a-9f6d-2b7c5a1e0f93"

describe("legal review request", () => {
  it("keeps the blocked segments of a backup in the request", () => {
    const payload = legalReviewSchema.parse({
      lastUpdatedAt: "2026-11-18T17:31:00Z",
      isFeasible: false,
      note: "Backup segment 1 passes a restricted zone",
      blockedSegments: [],
      blockedBackupSegments: [{ routePlanId: backupId, sequenceNo: 1 }],
    })
    expect(payload.blockedBackupSegments).toEqual([{ routePlanId: backupId, sequenceNo: 1 }])
  })

  it("refuses a feasible review that blocks a backup segment", () => {
    const result = legalReviewSchema.safeParse({
      lastUpdatedAt: "2026-11-18T17:31:00Z",
      isFeasible: true,
      blockedBackupSegments: [{ routePlanId: backupId, sequenceNo: 1 }],
    })
    expect(result.success).toBe(false)
  })
})

describe("rejection shown to the coordinator", () => {
  const review = { isFeasible: false, blockedSegments: [], reviewedAt: "2026-11-18T17:31:00Z" }

  it("is shown even when no segment was blocked", () => {
    expect(isCurrentlyRejected({ updatedAt: "2026-11-18T17:31:00Z", legalReview: review })).toBe(true)
  })

  it("is dropped once the plan is saved after the review, and never shown for a feasible review", () => {
    expect(isCurrentlyRejected({ updatedAt: "2026-11-18T18:00:00Z", legalReview: review })).toBe(false)
    expect(isCurrentlyRejected({ updatedAt: "2026-11-18T17:31:00Z", legalReview: { ...review, isFeasible: true } })).toBe(false)
  })
})
