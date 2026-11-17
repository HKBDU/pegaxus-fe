import { describe, expect, it } from "vitest";
import {
  canMarkReadyForSubmission,
  canRequestReupload,
} from "@/features/dossier/lib/document-review";
import type { DossierOverview } from "@/features/dossier/types";
import { toRouteMapData } from "@/features/route-view/adapters/route-plan-map.adapter";
import type {
  RoutePlanDetail,
  RouteSegment,
} from "@/features/route-view/types";

const dossier = (overrides: Partial<DossierOverview> = {}) =>
  ({
    status: "IN_PREPARATION",
    writeLocked: false,
    mandatoryTotal: 2,
    mandatorySatisfiedOrWaived: 2,
    pendingAuthorityRevision: null,
    ...overrides,
  }) as DossierOverview;

describe("mark ready for submission after an authority sent the dossier back", () => {
  it("is offered once every mandatory requirement is complete", () => {
    expect(canMarkReadyForSubmission("TRANSPORT_SPECIALIST", dossier())).toBe(
      true,
    );
  });

  it("waits until the specialist acts on the rejection", () => {
    const pending = dossier({
      pendingAuthorityRevision: {
        authorityName: "DGAL",
        decision: "REJECTED",
        sentBackAt: "2026-11-15T08:00:00Z",
      },
    });
    expect(canMarkReadyForSubmission("TRANSPORT_SPECIALIST", pending)).toBe(
      false,
    );
  });
});

describe("request re-upload of an approved document", () => {
  const approved = {
    status: "SATISFIED",
    document: { complianceDocumentId: "doc-1" },
  };

  it("is offered to the specialist while the dossier is being prepared", () => {
    expect(
      canRequestReupload("TRANSPORT_SPECIALIST", dossier(), approved),
    ).toBe(true);
  });

  it("is not offered for a document still waiting for review, to a customer, or once the dossier is submitted", () => {
    expect(
      canRequestReupload("TRANSPORT_SPECIALIST", dossier(), {
        ...approved,
        status: "PROVIDED",
      }),
    ).toBe(false);
    expect(canRequestReupload("CUSTOMER", dossier(), approved)).toBe(false);
    expect(
      canRequestReupload(
        "TRANSPORT_SPECIALIST",
        dossier({ status: "SUBMITTED", writeLocked: true }),
        approved,
      ),
    ).toBe(false);
  });
});

const location = (id: string, latitude: number, longitude: number) => ({
  locationId: id,
  locationName: id,
  locationType: "STABLE",
  city: id,
  country: "FR",
  latitude,
  longitude,
});

const segment = (
  id: string,
  sequenceNo: number,
  from: string,
  to: string,
  routeType: RouteSegment["routeType"],
) =>
  ({
    routePlanRouteId: id,
    sequenceNo,
    routeType,
    route: {
      routeId: `r-${id}`,
      routeCode: id,
      routeName: id,
      transportMode: "ROAD",
      distanceKm: 10,
      estimatedDurationMinutes: 60,
    },
    fromLocation: location(from, 48 + sequenceNo, 2),
    toLocation: location(to, 49 + sequenceNo, 3),
    isOutsourced: false,
  }) as unknown as RouteSegment;

describe("route map after a backup was activated", () => {
  it("keeps the replaced primary segments, drawn as replaced, beside the route in use", () => {
    const plan = {
      routePlanId: "plan-1",
      routePlanCode: "RP-1",
      updatedAt: "2026-11-15T08:00:00Z",
      legalReview: null,
      segments: [
        segment("done", 1, "A", "B", "PRIMARY"),
        segment("backup", 2, "B", "X", "BACKUP"),
      ],
      replacedSegments: [segment("old", 2, "B", "C", "PRIMARY")],
      replacedByRoutePlanCode: "RP-BACKUP-1",
    } as unknown as RoutePlanDetail;

    const { routes, locations } = toRouteMapData(plan);

    expect(routes.map((route) => [route.id, Boolean(route.replaced)])).toEqual([
      ["old", true],
      ["done", false],
      ["backup", false],
    ]);
    expect(locations.map((item) => item.id)).toContain("C");
  });
});
