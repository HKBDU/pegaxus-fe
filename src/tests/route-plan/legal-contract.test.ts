import { describe, expect, it } from "vitest";
import {
  createRoutePlanSchema,
  legalReviewResultSchema,
  legalReviewSchema,
} from "@/features/route-plan/schemas";

const segment = {
  sequenceNo: 1,
  routeId: "route-1",
  plannedDepartureAt: "2026-11-06T08:00:00Z",
  plannedArrivalAt: "2026-11-07T08:00:00Z",
};

describe("legal review contract", () => {
  it("allows PRIMARY and BACKUP submit actions but forces RETURN to SAVE_DRAFT", () => {
    expect(createRoutePlanSchema.safeParse({ routeType: "PRIMARY", segments: [segment], action: "SUBMIT_FOR_LEGAL_REVIEW" }).success).toBe(true);
    expect(createRoutePlanSchema.safeParse({ routeType: "BACKUP", segments: [segment], routeNote: "Backup route reason", action: "SUBMIT_FOR_LEGAL_REVIEW" }).success).toBe(true);
    expect(createRoutePlanSchema.safeParse({ routeType: "RETURN", segments: [segment], routeNote: "Return route reason", action: "SUBMIT_FOR_LEGAL_REVIEW" }).success).toBe(false);
  });

  it("requires a note for an infeasible legal review", () => {
    const base = { lastUpdatedAt: "2026-11-06T08:00:00Z", isFeasible: false };
    expect(legalReviewSchema.safeParse(base).success).toBe(false);
    expect(legalReviewSchema.safeParse({ ...base, note: "Blocked by customs restriction" }).success).toBe(true);
  });

  it("normalizes omitted blockedSegments and preserves authoritative request fields", () => {
    const result = legalReviewResultSchema.parse({
      routePlanId: "route-1",
      status: "DRAFT",
      legalReviewRequested: false,
      legalReviewRequestedAt: null,
      updatedAt: "2026-11-06T08:00:00Z",
      legalReview: { isFeasible: false, note: "Fix segment" },
    });
    expect(result.legalReview.blockedSegments).toEqual([]);
    expect(result.legalReviewRequested).toBe(false);
    expect(result.legalReviewRequestedAt).toBeNull();
  });
});
