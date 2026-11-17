import { describe, expect, it } from "vitest";
import { getMockTransportSegments } from "@/features/ongoing-transport/mock/segments";
import type { HandoverBoundary } from "@/features/ongoing-transport/types";

describe("ongoing-transport mock segments fixture", () => {
  it("provides Provider -> Provider chain with CARRIER_HANDOVER when totalSegments >= 4", async () => {
    // Calling getMockTransportSegments for a demo transport
    const result = await getMockTransportSegments("demo", "crew", "data");
    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess || !("value" in result) || !result.value || !("segments" in result.value)) {
      throw new Error("Expected result to have segments");
    }

    const { segments, handoverBoundaries } = result.value;
    if (segments.length >= 4) {
      const count = segments.length;
      const secondToLast = segments[count - 2]; // order = count - 1
      const last = segments[count - 1]; // order = count

      // Verify Provider 1 (Ferry)
      expect(secondToLast.isOutsourced).toBe(true);
      expect(secondToLast.transportMode).toBe("SEA");
      expect(secondToLast.provider?.providerName).toBe("EuroHorse Channel Ferry");
      expect(secondToLast.provider?.serviceType).toBe("Ferry crossing");

      // Verify Provider 2 (Road partner)
      expect(last.isOutsourced).toBe(true);
      expect(last.transportMode).toBe("ROAD");
      expect(last.provider?.providerName).toBe("Continental Horse Transit B.V.");
      expect(last.provider?.serviceType).toBe("Partner road transit");

      // Verify Handover boundary between the two providers (boundary at index count - 1)
      const providerBoundary = handoverBoundaries.find(
        (b: HandoverBoundary) =>
          b.fromRoutePlanRouteId === secondToLast.routePlanRouteId &&
          b.toRoutePlanRouteId === last.routePlanRouteId,
      );
      expect(providerBoundary).toBeDefined();
      expect(providerBoundary?.allowedHandoverTypes).toEqual(["CARRIER_HANDOVER"]);
      expect(providerBoundary?.handoverRequired).toBe(true);
    }
  });
});
