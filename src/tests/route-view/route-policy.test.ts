import { describe, expect, it } from "vitest";
import type { AuthPrincipal } from "@/features/auth/types";
import {
  canSpecialistReviewRoute,
  getPendingRouteActions,
  getPendingRouteCreation,
  hasPrimaryRoute,
  hasActivePrimary,
  hasOpenBackup,
  isDossierReady,
} from "@/features/route-view/route-policy";
import type { RoutePlanSummary, RouteWorkspaceContext } from "@/features/route-view/types";

const specialist: AuthPrincipal = { id: "specialist-1", roles: ["TRANSPORT_SPECIALIST"], permissions: [] };
const coordinator: AuthPrincipal = { id: "coordinator-1", roles: ["FLEET_ROUTE_COORDINATOR"], permissions: [] };

function route(
  routeType: RoutePlanSummary["routeType"],
  overrides: Partial<Pick<RoutePlanSummary, "status" | "legalReviewRequested" | "routePlanId">> = {},
): RoutePlanSummary {
  return {
    routePlanCode: `${routeType}-1`,
    routeType,
    status: "DRAFT",
    routePlanId: `${routeType.toLowerCase()}-1`,
    totalDistanceKm: 0,
    estimatedDurationMinutes: 0,
    isPersonnelComplete: true,
    segmentCount: 0,
    branchSequenceNo: null,
    replacesSequenceNo: null,
    routeNote: "",
    updatedAt: "2026-11-05T10:00:00Z",
    legalReviewRequested: true,
    legalReviewRequestedAt: "2026-11-05T10:00:00Z",
    ...overrides,
  };
}

function specialistContext(overrides: Partial<RouteWorkspaceContext> = {}): RouteWorkspaceContext {
  return { principal: specialist, planStatus: "APPROVED", transportStatus: "READY", dossierStatus: null, ...overrides };
}

describe("isDossierReady", () => {
  it("rejects a missing dossier", () => {
    expect(isDossierReady(undefined)).toBe(false);
    expect(isDossierReady(null)).toBe(false);
  });
  it("accepts only a DRAFT dossier", () => expect(isDossierReady("DRAFT")).toBe(true));
  it.each(["IN_PREPARATION", "APPROVED", "REJECTED"])("rejects %s", (status) => expect(isDossierReady(status)).toBe(false));
});

describe("canSpecialistReviewRoute", () => {
  it.each([
    ["PRIMARY", "DRAFT", "2026-11-05T10:00:00Z"],
    ["BACKUP", "DRAFT", "2026-11-05T10:00:00Z"],
    ["RETURN", "DRAFT", null],
    ["RETURN", "DRAFT", null],
  ] as const)("allows specialist review for %s with dossier %s", (routeType, dossierStatus, submittedAt) => {
    const context = specialistContext({ dossierStatus, transportStatus: routeType === "RETURN" ? "IN_TRANSIT" : "READY" });
    expect(canSpecialistReviewRoute(route(routeType, { legalReviewRequested: submittedAt != null }), context)).toBe(true);
  });

  it("blocks PRIMARY and BACKUP routes that were not submitted", () => {
    for (const routeType of ["PRIMARY", "BACKUP"] as const) {
      expect(canSpecialistReviewRoute(route(routeType, { legalReviewRequested: false }), specialistContext())).toBe(false);
    }
  });

  it("blocks RETURN routes when transport is not in transit", () => {
    expect(canSpecialistReviewRoute(route("RETURN", { legalReviewRequested: false }), specialistContext())).toBe(false);
  });

  it("blocks non-draft routes, non-draft dossiers, and non-specialists", () => {
    expect(canSpecialistReviewRoute(route("PRIMARY", { status: "ACTIVE" }), specialistContext())).toBe(false);
    expect(canSpecialistReviewRoute(route("PRIMARY"), specialistContext({ dossierStatus: "APPROVED" }))).toBe(false);
    expect(canSpecialistReviewRoute(route("PRIMARY"), { ...specialistContext(), principal: coordinator })).toBe(false);
  });

  it("allows a submitted BACKUP once the main dossier moved past DRAFT", () => {
    for (const dossierStatus of ["IN_PREPARATION", "APPROVED"]) {
      expect(canSpecialistReviewRoute(route("BACKUP", { legalReviewRequested: true }), specialistContext({ dossierStatus }))).toBe(true);
    }
  });
});

describe("primary and backup route presence", () => {
  it("does not count a cancelled primary as active", () => {
    expect(hasActivePrimary([route("PRIMARY", { status: "CANCELLED" })])).toBe(false);
  });
  it("recognizes an existing non-cancelled primary route", () => {
    expect(hasPrimaryRoute([route("PRIMARY", { status: "CONFIRMED" })])).toBe(true);
    expect(hasPrimaryRoute([route("PRIMARY", { status: "CANCELLED" })])).toBe(false);
  });
  it.each(["ACTIVE", "DRAFT"] as const)("counts an open backup with status %s", (status) => {
    expect(hasOpenBackup([route("BACKUP", { status })])).toBe(true);
  });
  it.each(["CANCELLED", "REJECTED_BY_MANAGER"] as const)("does not count a closed backup with status %s", (status) => {
    expect(hasOpenBackup([route("BACKUP", { status })])).toBe(false);
  });
});

describe("getPendingRouteCreation", () => {
  const context = specialistContext({ principal: coordinator, transportStatus: "PLANNING" });
  it("offers Add Backup Route only when there is an active primary and no open backup", () => {
    expect(getPendingRouteCreation([route("PRIMARY", { status: "ACTIVE" })], context, "transport-1")?.label).toBe("Add Backup Route");
    expect(getPendingRouteCreation([route("PRIMARY", { status: "CONFIRMED" })], context, "transport-1")?.label).toBe("Add Backup Route");
    expect(getPendingRouteCreation([route("PRIMARY", { status: "ACTIVE" }), route("BACKUP", { status: "DRAFT" })], context, "transport-1")).toBeNull();
  });

  it("hides Add Backup Route once the transport is READY or later", () => {
    for (const transportStatus of ["READY", "IN_TRANSIT", "COMPLETED"]) {
      expect(getPendingRouteCreation([route("PRIMARY", { status: "CONFIRMED" })], { ...context, transportStatus }, "transport-1")).toBeNull();
    }
  });
});

describe("workspace and detail policy consistency", () => {
  it("returns the same review decision for table and detail", () => {
    const selectedRoute = route("PRIMARY");
    const context = specialistContext({ dossierStatus: "DRAFT", routeDetailPath: (id) => `/routes/${id}` });
    expect(getPendingRouteActions(selectedRoute, context)).toEqual([
      { label: "Review Legal Feasibility", reason: "Review the route's legal feasibility.", href: "/routes/primary-1" },
    ]);
    expect(canSpecialistReviewRoute(selectedRoute, context)).toBe(true);
  });

  it("does not allow review when dossier status is absent", () => {
    const context = specialistContext({ dossierStatus: null });
    expect(canSpecialistReviewRoute(route("PRIMARY"), context)).toBe(false);
    expect(getPendingRouteActions(route("PRIMARY"), context)).toHaveLength(0);
  });
});
