import { describe, expect, it } from "vitest";
import type { AuthPrincipal } from "@/features/auth/types";
import {
  canSpecialistReviewRoute,
  getPendingRouteActions,
  getPendingRouteCreation,
  hasActivePrimary,
  hasOpenBackup,
  isDossierReady,
} from "@/features/route-view/route-policy";
import type { RoutePlanSummary, RouteWorkspaceContext } from "@/features/route-view/types";

const specialist: AuthPrincipal = { id: "specialist-1", roles: ["TRANSPORT_SPECIALIST"], permissions: [] };
const coordinator: AuthPrincipal = { id: "coordinator-1", roles: ["FLEET_ROUTE_COORDINATOR"], permissions: [] };

function route(
  routeType: RoutePlanSummary["routeType"],
  overrides: Partial<Pick<RoutePlanSummary, "status" | "submittedForReviewAt" | "routePlanId">> = {},
) {
  return {
    routeType,
    status: "DRAFT",
    routePlanId: `${routeType.toLowerCase()}-1`,
    submittedForReviewAt: "2026-11-05T10:00:00Z",
    ...overrides,
  } as Pick<RoutePlanSummary, "routeType" | "status" | "submittedForReviewAt"> &
    Partial<Pick<RoutePlanSummary, "routePlanId">>;
}

function specialistContext(overrides: Partial<RouteWorkspaceContext> = {}): RouteWorkspaceContext {
  return { principal: specialist, planStatus: "APPROVED", transportStatus: "READY", dossierStatus: null, ...overrides };
}

describe("isDossierReady", () => {
  it.each([undefined, null, "DRAFT"])("accepts %s as ready", (status) => expect(isDossierReady(status)).toBe(true));
  it.each(["IN_PREPARATION", "APPROVED", "REJECTED"])("rejects %s", (status) => expect(isDossierReady(status)).toBe(false));
});

describe("canSpecialistReviewRoute", () => {
  it.each([
    ["PRIMARY", null, "2026-11-05T10:00:00Z"],
    ["PRIMARY", "DRAFT", "2026-11-05T10:00:00Z"],
    ["BACKUP", null, "2026-11-05T10:00:00Z"],
    ["RETURN", null, null],
    ["RETURN", "DRAFT", null],
  ] as const)("allows specialist review for %s with dossier %s", (routeType, dossierStatus, submittedAt) => {
    const context = specialistContext({ dossierStatus, transportStatus: routeType === "RETURN" ? "IN_TRANSIT" : "READY" });
    expect(canSpecialistReviewRoute(route(routeType, { submittedForReviewAt: submittedAt }), context)).toBe(true);
  });

  it("blocks PRIMARY and BACKUP routes that were not submitted", () => {
    for (const routeType of ["PRIMARY", "BACKUP"] as const) {
      expect(canSpecialistReviewRoute(route(routeType, { submittedForReviewAt: null }), specialistContext())).toBe(false);
    }
  });

  it("blocks RETURN routes when transport is not in transit", () => {
    expect(canSpecialistReviewRoute(route("RETURN", { submittedForReviewAt: null }), specialistContext())).toBe(false);
  });

  it("blocks non-draft routes, non-draft dossiers, and non-specialists", () => {
    expect(canSpecialistReviewRoute(route("PRIMARY", { status: "ACTIVE" }), specialistContext())).toBe(false);
    expect(canSpecialistReviewRoute(route("PRIMARY"), specialistContext({ dossierStatus: "APPROVED" }))).toBe(false);
    expect(canSpecialistReviewRoute(route("PRIMARY"), { ...specialistContext(), principal: coordinator })).toBe(false);
  });
});

describe("primary and backup route presence", () => {
  it("does not count a cancelled primary as active", () => {
    expect(hasActivePrimary([route("PRIMARY", { status: "CANCELLED" })])).toBe(false);
  });
  it.each(["ACTIVE", "DRAFT"])("counts an open backup with status %s", (status) => {
    expect(hasOpenBackup([route("BACKUP", { status })])).toBe(true);
  });
  it.each(["CANCELLED", "REJECTED_BY_MANAGER"])("does not count a closed backup with status %s", (status) => {
    expect(hasOpenBackup([route("BACKUP", { status })])).toBe(false);
  });
});

describe("getPendingRouteCreation", () => {
  const context = specialistContext({ principal: coordinator });
  it("offers Add Backup Route only when there is an active primary and no open backup", () => {
    expect(getPendingRouteCreation([route("PRIMARY", { status: "ACTIVE" })], context, "transport-1")?.label).toBe("Add Backup Route");
    expect(getPendingRouteCreation([route("PRIMARY", { status: "ACTIVE" }), route("BACKUP", { status: "DRAFT" })], context, "transport-1")).toBeNull();
  });
});

describe("workspace and detail policy consistency", () => {
  it("returns the same review decision for table and detail", () => {
    const selectedRoute = route("PRIMARY");
    const context = specialistContext({ routeDetailPath: (id) => `/routes/${id}` });
    expect(getPendingRouteActions(selectedRoute as RoutePlanSummary, context)).toEqual([
      { label: "Review Legal Feasibility", reason: "Review the route's legal feasibility.", href: "/routes/primary-1" },
    ]);
    expect(canSpecialistReviewRoute(selectedRoute, context)).toBe(true);
  });

  it("does not create a dossier warning decision when dossier status is absent", () => {
    const context = specialistContext({ dossierStatus: null });
    expect(canSpecialistReviewRoute(route("PRIMARY"), context)).toBe(true);
    expect(getPendingRouteActions(route("PRIMARY") as RoutePlanSummary, context)).toHaveLength(1);
  });
});
