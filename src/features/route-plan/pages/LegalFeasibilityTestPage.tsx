import { LegalFeasibilityPanel } from "../components/LegalFeasibilityPanel";
import type { RouteSegment } from "../types";

const segments: Pick<RouteSegment, "sequenceNo" | "route">[] = [
  {
    sequenceNo: 1,
    route: {
      routeId: "test-route-a",
      routeCode: "TEST-A",
      routeName: "Newmarket → Folkestone BCP",
      transportMode: "ROAD",
      distanceKm: 164,
      estimatedDurationMinutes: 180,
    },
  },
  {
    sequenceNo: 2,
    route: {
      routeId: "test-route-b",
      routeCode: "TEST-B",
      routeName: "Folkestone BCP → Dover Docks",
      transportMode: "ROAD",
      distanceKm: 20,
      estimatedDurationMinutes: 35,
    },
  },
  {
    sequenceNo: 3,
    route: {
      routeId: "test-route-c",
      routeCode: "TEST-C",
      routeName: "Dover Docks → Dublin Gateway",
      transportMode: "SEA",
      distanceKm: 480,
      estimatedDurationMinutes: 900,
    },
  },
];

export default function LegalFeasibilityTestPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <LegalFeasibilityPanel
        routePlanId="mock-route-plan"
        lastUpdatedAt="2026-10-10T08:00:00Z"
        segments={segments}
        legalReview={{
          isFeasible: false,
          note: "All required permits are obtainable, except Segment 1. Consider another route.",
          blockedSegments: [1],
          reviewedBy: {
            employeeId: "test-ts-001",
            employeeCode: "EMP-2026-021",
            fullName: "Nguyen Van A",
            role: "Transport Specialist",
          },
          reviewedAt: "2026-10-09T08:00:00Z",
        }}
      />
    </main>
  );
}
