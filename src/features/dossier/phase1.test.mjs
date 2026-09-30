import assert from "node:assert/strict";
import { after, test } from "node:test";
import { existsSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true, hmr: false } });
after(async () => vite.close());

test("dossier follows the feature structure and exposes only the page publicly", async () => {
  for (const path of [
    "components/DossierOverview.tsx",
    "components/DossierStatusBadge.tsx",
    "components/DossierRequirementsPreview.tsx",
    "hooks/useDossier.ts",
    "pages/DossierDetailsPage.tsx",
    "constants.ts", "schemas.ts", "services.ts", "types.ts", "index.ts",
  ]) {
    assert.equal(existsSync(new URL(`./${path}`, import.meta.url)), true, path);
  }
  const feature = await vite.ssrLoadModule("/src/features/dossier/index.ts");
  assert.deepEqual(Object.keys(feature), ["DossierDetailsPage"]);
});

test("Dossier constants preserve backend states and current filter defaults", async () => {
  const { dossierStatusLabels, dossierRequirementStatusOptions, initialDossierRequirementsParams } =
    await vite.ssrLoadModule("/src/features/dossier/constants.ts");
  assert.equal(dossierStatusLabels.SATISFIED, "Completed");
  assert.equal(dossierStatusLabels.PROVIDED, "In review");
  assert.deepEqual(dossierRequirementStatusOptions.map(({ value }) => value), [
    "ALL", "PENDING", "REQUESTED", "PROVIDED", "SATISFIED", "REJECTED", "WAIVED",
  ]);
  assert.deepEqual(initialDossierRequirementsParams, {
    pageIndex: 1, pageSize: 20, sortBy: "createdAt:asc",
  });
});

test("D7 and D8 accept the documented nullable fields", async () => {
  const { dossierOverviewEnvelopeSchema, dossierRequirementsEnvelopeSchema } =
    await vite.ssrLoadModule("/src/features/dossier/schemas.ts");
  const overview = dossierOverviewEnvelopeSchema.parse({
    isSuccess: true,
    code: 200,
    message: "ComplianceDossier retrieved successfully",
    value: {
      complianceDossierId: 501,
      dossierCode: "CD-20260925-7731",
      bookingId: 88,
      bookingCode: "REQ-20260925-1002",
      status: "IN_PREPARATION",
      openedAt: "2026-09-25T02:00:00Z",
      readyForSubmissionAt: null,
      approvedAt: null,
      rejectedAt: null,
      closedAt: null,
      rejectionReason: null,
      note: null,
      writeLocked: false,
      writeLockReason: null,
      progressPercent: 62.5,
      mandatoryTotal: 8,
      mandatorySatisfiedOrWaived: 5,
      quarantineStatus: null,
      customsClearanceStatus: null,
    },
  });
  assert.equal(overview.value.progressPercent, 62.5);

  const requirements = dossierRequirementsEnvelopeSchema.parse({
    isSuccess: true,
    code: 200,
    message: "DossierRequirements retrieved successfully",
    value: {
      items: [{
        dossierRequirementId: 8101,
        complianceRequirementId: 31,
        requirementName: "Transport Permit",
        horseId: null,
        horseName: null,
        status: "PENDING",
        isMandatory: true,
        dueDate: null,
        validUntil: null,
        satisfiedAt: null,
        waivedReason: null,
        note: null,
        document: null,
      }],
      pageIndex: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    },
  });
  assert.equal(requirements.value.items[0].document, null);
  assert.equal(requirements.value.items[0].horseId, null);
});

test("mock mode requires an explicit true flag in DEV", async () => {
  const { resolveDossierSource } = await vite.ssrLoadModule(
    "/src/features/dossier/source.ts",
  );
  assert.equal(resolveDossierSource(true, "true"), "mock");
  assert.equal(resolveDossierSource(true, undefined), "api");
  assert.equal(resolveDossierSource(true, "false"), "api");
  assert.equal(resolveDossierSource(false, "true"), "api");
});

test("real service requests D7/D8 and parses the Flow 2 value envelope", async () => {
  const { default: apiClient } = await vite.ssrLoadModule("/src/lib/axios.ts");
  const { dossierService } = await vite.ssrLoadModule("/src/features/dossier/services.ts");
  const { getMockDossier, getMockRequirements } = await vite.ssrLoadModule(
    "/src/features/dossier/mocks/dossier.mock.ts",
  );
  const originalGet = apiClient.get;
  const requests = [];
  apiClient.get = async (url, config) => {
    requests.push({ url, config });
    return {
      isSuccess: true,
      code: 200,
      message: "OK",
      value: url.endsWith("/requirements")
        ? getMockRequirements("501", config.params, "normal")
        : getMockDossier("501", "normal"),
    };
  };

  try {
    const controller = new AbortController();
    const overview = await dossierService.getOverview("501", controller.signal);
    const page = await dossierService.getRequirements("501", {
      status: "REJECTED", horseId: 72, pageIndex: 1, pageSize: 5, sortBy: "dueDate:asc",
    }, controller.signal);
    assert.equal(overview.complianceDossierId, 501);
    assert.equal(page.items[0].status, "REJECTED");
    assert.deepEqual(requests.map(({ url }) => url), [
      "compliance-dossiers/501", "compliance-dossiers/501/requirements",
    ]);
    assert.equal(requests[0].config.signal, controller.signal);
    assert.deepEqual(requests[1].config.params, {
      status: "REJECTED", horseId: 72, pageIndex: 1, pageSize: 5, sortBy: "dueDate:asc",
    });

    apiClient.get = async () => { throw { response: { status: 404 } }; };
    await assert.rejects(dossierService.getOverview("501"), (error) => error.response.status === 404);
  } finally {
    apiClient.get = originalGet;
  }
});

test("DEV data follows D7/D8 and filters the paginated requirements", async () => {
  const { dossierOverviewSchema, dossierRequirementsPageSchema } =
    await vite.ssrLoadModule("/src/features/dossier/schemas.ts");
  const { getMockDossier, getMockRequirements } = await vite.ssrLoadModule(
    "/src/features/dossier/mocks/dossier.mock.ts",
  );
  const dossier = dossierOverviewSchema.parse(getMockDossier("501", "normal"));
  assert.equal(dossier.mandatorySatisfiedOrWaived, 5);
  const filtered = dossierRequirementsPageSchema.parse(
    getMockRequirements("501", {
      status: "REJECTED", pageIndex: 1, pageSize: 1, sortBy: "createdAt:asc",
    }, "normal"),
  );
  assert.equal(filtered.items.length, 1);
  assert.equal(filtered.items[0].status, "REJECTED");
  assert.equal(getMockRequirements("501", { pageIndex: 1, pageSize: 20 }, "empty").items.length, 0);
  assert.equal(getMockDossier("501", "locked").writeLocked, true);
  assert.throws(() => getMockDossier("999", "normal"), (error) => error.status === 404);
});

test("the page renders contract data without future write actions", async () => {
  const { default: DossierDetailsPage } = await vite.ssrLoadModule(
    "/src/features/dossier/pages/DossierDetailsPage.tsx",
  );
  const { dossierKeys } = await vite.ssrLoadModule(
    "/src/features/dossier/hooks/useDossier.ts",
  );
  const { getMockDossier, getMockRequirements } = await vite.ssrLoadModule(
    "/src/features/dossier/mocks/dossier.mock.ts",
  );
  const params = { pageIndex: 1, pageSize: 20, sortBy: "createdAt:asc" };
  const client = new QueryClient();
  client.setQueryData(dossierKeys.overview("501"), getMockDossier("501", "normal"));
  client.setQueryData(
    dossierKeys.requirements("501", params),
    getMockRequirements("501", params, "normal"),
  );
  const markup = renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client },
      React.createElement(MemoryRouter, { initialEntries: ["/dossiers/501"] },
        React.createElement(Routes, null,
          React.createElement(Route, {
            path: "/dossiers/:dossierId",
            element: React.createElement(DossierDetailsPage),
          }),
        ),
      ),
    ),
  );
  assert.match(markup, /CD-20260925-7731/);
  assert.match(markup, /62\.5%/);
  assert.match(markup, /Transport Permit/);
  assert.match(markup, /Trip-level requirements/);
  assert.match(markup, /Horse-specific requirements/);
  assert.match(markup, /Pegaxus Star/);
  assert.match(markup, /lucide-chess-knight/);
  assert.match(markup, /sm:w-44/);
  assert.match(markup, /aria-label="Mandatory requirement"/);
  assert.match(markup, /lucide-circle/);
  assert.doesNotMatch(markup, />Scope</);
  assert.match(markup, /Documents \/ Reviews/);
  assert.match(markup, /Authority &amp; Inspection/);
  assert.doesNotMatch(markup, /Audit History/);
  assert.match(markup, /Back to Booking/);
  assert.doesNotMatch(markup, /Search requirement|Requirement Code|Lead Time/);
  assert.doesNotMatch(markup, /Upload Document|Approve Document|Ready For Submission/);
});

test("a signed-in role sees a three-dot requirement menu inside the shared table", async () => {
  const { RequirementTable } = await vite.ssrLoadModule("/src/features/dossier/components/DossierRequirementsPreview.tsx");
  const { getMockRequirements } = await vite.ssrLoadModule("/src/features/dossier/mocks/dossier.mock.ts");
  const item = getMockRequirements("501", { pageIndex: 1, pageSize: 20 }, "normal").items[0];
  const markup = renderToStaticMarkup(React.createElement(RequirementTable, { items: [item], role: "CUSTOMER" }));
  assert.match(markup, /Actions for Transport Permit/);
  assert.match(markup, /data-slot="dropdown-menu-trigger"/);
  assert.match(markup, /data-slot="table"/);
  assert.doesNotMatch(markup, />Scope</);
});

test("requirement menu labels follow the backend status and current role", async () => {
  const { getDossierRequirementActionLabels } = await vite.ssrLoadModule("/src/features/dossier/constants.ts");
  assert.deepEqual(getDossierRequirementActionLabels("CUSTOMER", "PENDING", false), ["Upload Document"]);
  assert.deepEqual(getDossierRequirementActionLabels("CUSTOMER", "PROVIDED", true), ["View Document", "Edit Uploaded Document"]);
  assert.deepEqual(getDossierRequirementActionLabels("CUSTOMER", "REQUESTED", true), ["View Request", "View Document", "Upload New Version"]);
  assert.deepEqual(getDossierRequirementActionLabels("CUSTOMER", "REJECTED", true), ["View Request", "View Document", "Upload New Version"]);
  assert.deepEqual(getDossierRequirementActionLabels("CUSTOMER", "SATISFIED", true), ["View Document"]);
  assert.deepEqual(getDossierRequirementActionLabels("CUSTOMER", "WAIVED", false), ["View Requirement"]);
  assert.deepEqual(getDossierRequirementActionLabels("TRANSPORT_SPECIALIST", "PENDING", false), ["View Requirement", "Request Missing Document"]);
  assert.deepEqual(getDossierRequirementActionLabels("TRANSPORT_SPECIALIST", "PROVIDED", true), ["View Document", "Review Document"]);
  assert.deepEqual(getDossierRequirementActionLabels("TRANSPORT_SPECIALIST", "REJECTED", true), ["View Request", "View Review History"]);
  assert.deepEqual(getDossierRequirementActionLabels("TRANSPORT_SPECIALIST", "SATISFIED", true), ["View Document", "View Review Result"]);
  assert.deepEqual(getDossierRequirementActionLabels("TRANSPORT_SPECIALIST", "WAIVED", false), ["View Requirement"]);
  assert.deepEqual(getDossierRequirementActionLabels("LOGISTICS_MANAGER", "PENDING", false), ["View Requirement"]);
  assert.deepEqual(getDossierRequirementActionLabels("LOGISTICS_MANAGER", "SATISFIED", true), ["View Requirement", "View Document", "View Review Result"]);
  assert.deepEqual(getDossierRequirementActionLabels("LOGISTICS_MANAGER", "REJECTED", false), ["View Requirement"]);
  assert.deepEqual(getDossierRequirementActionLabels(undefined, "PENDING", false), []);
});

test("proof projections remain separate from the dossier status", async () => {
  const { default: DossierDetailsPage } = await vite.ssrLoadModule(
    "/src/features/dossier/pages/DossierDetailsPage.tsx",
  );
  const { dossierKeys } = await vite.ssrLoadModule(
    "/src/features/dossier/hooks/useDossier.ts",
  );
  const { getMockDossier } = await vite.ssrLoadModule(
    "/src/features/dossier/mocks/dossier.mock.ts",
  );
  const client = new QueryClient();
  client.setQueryData(dossierKeys.overview("501"), {
    ...getMockDossier("501", "normal"),
    status: "APPROVED",
    quarantineStatus: { latestProofId: 7001, status: "PASSED_WITH_CONDITIONS", verifiedAt: null },
    customsClearanceStatus: { latestProofId: 7101, status: "HELD", verifiedAt: null },
  });
  const markup = renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client },
      React.createElement(MemoryRouter, { initialEntries: ["/dossiers/501"] },
        React.createElement(Routes, null,
          React.createElement(Route, {
            path: "/dossiers/:dossierId",
            element: React.createElement(DossierDetailsPage),
          }),
        ),
      ),
    ),
  );
  assert.match(markup, /Quarantine proof/);
  assert.match(markup, /Passed with conditions/);
  assert.match(markup, /Customs clearance proof/);
  assert.match(markup, /Held/);
});

test("audit integration tab is visible only to employee roles", async () => {
  const { canViewDossierAudit } = await vite.ssrLoadModule("/src/features/dossier/constants.ts");
  assert.equal(canViewDossierAudit(undefined), false);
  assert.equal(canViewDossierAudit(["CUSTOMER"]), false);
  assert.equal(canViewDossierAudit(["TRANSPORT_SPECIALIST"]), true);
  assert.equal(canViewDossierAudit(["LOGISTICS_MANAGER"]), true);
});

test("overview enriches booking information only when a booking response is available", async () => {
  const { DossierOverview } = await vite.ssrLoadModule("/src/features/dossier/components/DossierOverview.tsx");
  const { getMockDossier } = await vite.ssrLoadModule("/src/features/dossier/mocks/dossier.mock.ts");
  const dossier = getMockDossier("501", "normal");
  const booking = {
    status: "APPROVED",
    originCountry: "GB",
    destinationCountry: "FR",
    requestedDepartureDate: "2026-10-05",
    totalHorses: 2,
    customer: { fullName: "Greenwood Racing Ltd" },
  };
  const withBooking = renderToStaticMarkup(React.createElement(DossierOverview, { dossier, booking }));
  const withoutBooking = renderToStaticMarkup(React.createElement(DossierOverview, { dossier }));
  assert.match(withBooking, /Greenwood Racing Ltd/);
  assert.match(withBooking, /GB/);
  assert.match(withBooking, /FR/);
  assert.doesNotMatch(withoutBooking, /Greenwood Racing Ltd/);
});

test("dossier navigation does not depend on role-specific booking routes", () => {
  assert.equal(existsSync(new URL("./navigation.ts", import.meta.url)), false);
});
