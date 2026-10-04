import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, test } from "node:test";
import { createServer } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  define: { "import.meta.env.VITE_DOSSIER_API_MOCKS": JSON.stringify("true") },
});
after(async () => vite.close());
const load = (name) => vite.ssrLoadModule(`/src/features/dossier/${name}`);
const body = { dossierRequirementIds: [8106, 8108], dueDate: "2026-10-10", note: "  Please submit before departure.  " };
const mockRow = (id, status = "PENDING", horseId = null) => ({
  dossierRequirementId: id, complianceRequirementId: 31, requirementName: `Requirement ${id}`,
  horseId, horseName: null, status, isMandatory: true, document: null,
  dueDate: null, validUntil: null, satisfiedAt: null, waivedReason: null, note: null,
});

test("V5 schema accepts IDs, trims note and allows omitted optional fields", async () => {
  const { missingDocumentReminderSchema: schema } = await load("schemas.ts");
  assert.ok(schema, "V5 request schema must exist");
  assert.deepEqual(schema.parse(body), { ...body, note: body.note.trim() });
  assert.deepEqual(schema.parse({ dossierRequirementIds: [1], dueDate: "", note: "  " }), { dossierRequirementIds: [1] });
  assert.deepEqual(schema.parse({ dossierRequirementIds: [1] }), { dossierRequirementIds: [1] });
});

test("V5 requires nonempty unique positive IDs", async () => {
  const { missingDocumentReminderSchema: schema } = await load("schemas.ts");
  assert.ok(schema);
  for (const ids of [[], [1, 1], [0], [-1], [1.5], ["1"]]) {
    assert.equal(schema.safeParse({ dossierRequirementIds: ids }).success, false);
  }
});

test("V5 rejects invalid calendar dates and screenshot-only fields never reach the payload", async () => {
  const { missingDocumentReminderSchema: schema } = await load("schemas.ts");
  assert.ok(schema);
  for (const dueDate of ["10/10/2026", "2026-02-30", "2026-10-10T17:00:00Z"]) {
    assert.equal(schema.safeParse({ ...body, dueDate }).success, false);
  }
  assert.deepEqual(schema.parse({ ...body, priority: "HIGH", subject: "Fake", deliveryChannels: ["EMAIL"], recipientEmail: "fake@example.com", reminderTime: "17:00" }), { ...body, note: body.note.trim() });
});

for (const role of ["TRANSPORT_SPECIALIST", "CUSTOMER", "LOGISTICS_MANAGER", "DRIVER", undefined]) {
  test(`V5 eligibility for role ${role}`, async () => {
    const { canSendMissingDocumentReminder } = await load("constants.ts");
    assert.equal(typeof canSendMissingDocumentReminder, "function");
    assert.equal(canSendMissingDocumentReminder(role, { status: "IN_PREPARATION", writeLocked: false }), role === "TRANSPORT_SPECIALIST");
  });
}

test("V5 eligibility rejects locked and non-preparation dossiers", async () => {
  const { canSendMissingDocumentReminder } = await load("constants.ts");
  assert.equal(typeof canSendMissingDocumentReminder, "function");
  for (const dossier of [{ status: "IN_PREPARATION", writeLocked: true }, { status: "READY_FOR_SUBMISSION", writeLocked: false }, { status: "CLOSED", writeLocked: true }]) {
    assert.equal(canSendMissingDocumentReminder("TRANSPORT_SPECIALIST", dossier), false);
  }
});

for (const status of ["PENDING", "REQUESTED", "PROVIDED", "SATISFIED", "REJECTED", "WAIVED"]) {
  test(`missing list eligibility for ${status}`, async () => {
    const { isMissingDossierRequirement } = await load("constants.ts");
    assert.equal(typeof isMissingDossierRequirement, "function");
    assert.equal(isMissingDossierRequirement(mockRow(1, status)), ["PENDING", "REQUESTED"].includes(status));
    assert.equal(isMissingDossierRequirement({ ...mockRow(1, status), document: { complianceDocumentId: 1 } }), false);
  });
}

test("V5 service posts the exact batch endpoint and preserves partial remindedCount", async () => {
  const { dossierService } = await load("services.ts");
  assert.equal(typeof dossierService.sendMissingRequirementReminder, "function");
  const { default: apiClient } = await vite.ssrLoadModule("/src/lib/axios.ts");
  const previous = apiClient.post;
  const calls = [];
  apiClient.post = async (url, payload) => {
    calls.push({ url, payload });
    return { isSuccess: true, code: 200, message: "Reminder sent", value: { remindedCount: 1 } };
  };
  try {
    const response = await dossierService.sendMissingRequirementReminder({ dossierId: "501", reminder: body });
    assert.deepEqual(calls, [{ url: "compliance-dossiers/501/requirements/reminders", payload: { ...body, note: body.note.trim() } }]);
    assert.deepEqual(response.value, { remindedCount: 1 });
    await assert.rejects(() => dossierService.sendMissingRequirementReminder({ dossierId: "501", reminder: { dossierRequirementIds: [] } }));
    assert.equal(calls.length, 1);
  } finally { apiClient.post = previous; }
});

test("V5 response validates nonnegative integer remindedCount", async () => {
  const { missingDocumentReminderEnvelopeSchema: schema } = await load("schemas.ts");
  assert.ok(schema);
  const response = { isSuccess: true, code: 200, message: "OK", value: { remindedCount: 2 } };
  assert.equal(schema.parse(response).value.remindedCount, 2);
  for (const remindedCount of [-1, 1.5]) assert.equal(schema.safeParse({ ...response, value: { remindedCount } }).success, false);
});

test("complete missing loader traverses both status page sets without table horse filters", async () => {
  const { collectMissingDossierRequirements } = await load("lib/missing-document-reminder.ts");
  const calls = [];
  const signal = new AbortController().signal;
  const items = await collectMissingDossierRequirements(async (params, receivedSignal) => {
    calls.push(params);
    assert.equal(receivedSignal, signal);
    const id = (params.status === "PENDING" ? 0 : 1000) + params.pageIndex;
    return { items: [mockRow(id, params.status)], pageIndex: params.pageIndex, pageSize: params.pageSize, totalItems: 2, totalPages: 2 };
  }, signal);
  assert.equal(items.length, 4);
  assert.deepEqual(calls.map(({ status, pageIndex }) => [status, pageIndex]), [["PENDING", 1], ["PENDING", 2], ["REQUESTED", 1], ["REQUESTED", 2]]);
  assert.ok(calls.every((params) => params.pageSize === 100 && params.horseId === undefined));
});

test("complete missing loader propagates failure and abort rather than returning a partial set", async () => {
  const { collectMissingDossierRequirements } = await load("lib/missing-document-reminder.ts");
  await assert.rejects(() => collectMissingDossierRequirements(async ({ pageIndex }) => {
    if (pageIndex === 2) throw new Error("Network failure");
    return { items: [mockRow(1)], pageIndex: 1, pageSize: 100, totalItems: 101, totalPages: 2 };
  }), /Network failure/);
  const controller = new AbortController(); controller.abort();
  let called = false;
  await assert.rejects(() => collectMissingDossierRequirements(async () => { called = true; }, controller.signal));
  assert.equal(called, false);
});

test("missing grouping uses trip first and D7 horse names without deriving full options from D8", async () => {
  const { groupMissingDossierRequirements } = await load("lib/missing-document-reminder.ts");
  const groups = groupMissingDossierRequirements([mockRow(1, "PENDING", 72), mockRow(2), mockRow(3, "REQUESTED", 71)], [{ horseId: 71, horseName: "Pegaxus Star" }, { horseId: 72, horseName: "Silver Arrow" }]);
  assert.deepEqual(groups.map(({ title }) => title), ["Common Trip Documents", "Pegaxus Star", "Silver Arrow"]);
});

test("baseline mock contains every lifecycle state without PROVIDED/null inconsistencies", async () => {
  const mock = await load("mocks/dossier.mock.ts");
  const rows = mock.getMockRequirements("501", {}, "normal").items;
  for (const status of ["PENDING", "REQUESTED", "PROVIDED", "SATISFIED", "REJECTED", "WAIVED"]) assert.ok(rows.some((item) => item.status === status), `Missing ${status} fixture`);
  assert.ok(rows.filter((item) => ["PROVIDED", "SATISFIED", "REJECTED"].includes(item.status)).every((item) => item.document));
  assert.equal(mock.getMockDossier("501", "normal").progressPercent, 62.5);
});

test("V5 mock processes PENDING, REQUESTED and optional rows while skipping nonmissing IDs", async () => {
  const mock = await load("mocks/dossier.mock.ts");
  assert.equal(typeof mock.sendMockMissingRequirementReminder, "function");
  const before = mock.getMockDossier("501", "normal");
  const response = mock.sendMockMissingRequirementReminder("501", { dossierRequirementIds: [8106, 8108, 8110, 8107, 8109, 8101, 8104], dueDate: "2026-10-10", note: "Do not store this note on a DR" }, "normal");
  const rows = mock.getMockRequirements("501", {}, "normal").items;
  for (const id of [8106, 8108, 8110]) {
    const row = rows.find((item) => item.dossierRequirementId === id);
    assert.equal(row.status, "REQUESTED"); assert.equal(row.dueDate, "2026-10-10");
    assert.notEqual(row.note, "Do not store this note on a DR");
  }
  assert.equal(response.value.remindedCount, 3);
  const after = mock.getMockDossier("501", "normal");
  assert.equal(after.progressPercent, before.progressPercent);
  assert.equal(after.mandatorySatisfiedOrWaived, before.mandatorySatisfiedOrWaived);
  assert.equal(after.requirementSummary.total, before.requirementSummary.total);
  assert.equal(after.requirementSummary.pending, before.requirementSummary.pending - 2);
  assert.equal(after.requirementSummary.requested, before.requirementSummary.requested + 2);
});

test("V5 re-reminder remains REQUESTED and preserves date when omitted", async () => {
  const mock = await load("mocks/dossier.mock.ts");
  assert.equal(typeof mock.sendMockMissingRequirementReminder, "function");
  const before = mock.getMockDossier("501", "normal");
  const response = mock.sendMockMissingRequirementReminder("501", { dossierRequirementIds: [8108] }, "normal");
  const after = mock.getMockDossier("501", "normal");
  assert.equal(response.value.remindedCount, 1);
  assert.deepEqual(after.requirementSummary, before.requirementSummary);
  assert.equal(after.progressPercent, before.progressPercent);
  assert.equal(mock.getMockRequirements("501", {}, "normal").items.find((item) => item.dossierRequirementId === 8108).dueDate, "2026-10-10");
});

test("V5 NO_MISSING_DR and DOSSIER_LOCKED cannot mutate state", async () => {
  const mock = await load("mocks/dossier.mock.ts");
  assert.equal(typeof mock.sendMockMissingRequirementReminder, "function");
  const before = mock.getMockDossier("501", "normal");
  assert.throws(() => mock.sendMockMissingRequirementReminder("501", { dossierRequirementIds: [8101, 8104, 8107, 8109] }, "normal"), /NO_MISSING_DR/);
  assert.throws(() => mock.sendMockMissingRequirementReminder("501", body, "locked"), /DOSSIER_LOCKED/);
  assert.deepEqual(mock.getMockDossier("501", "normal"), before);
});

test("independent scenario dossiers cover no eligible, locked, mandatory-ready and resulting ready states", async () => {
  const mock = await load("mocks/dossier.mock.ts");
  assert.equal(mock.getMockDossier("502", "normal").requirementSummary.pending, 0);
  assert.equal(mock.getMockDossier("502", "normal").requirementSummary.requested, 0);
  assert.equal(mock.getMockDossier("503", "normal").writeLocked, true);
  assert.equal(mock.getMockDossier("504", "normal").status, "IN_PREPARATION");
  assert.equal(mock.getMockDossier("504", "normal").progressPercent, 100);
  assert.equal(mock.getMockDossier("505", "normal").status, "READY_FOR_SUBMISSION");
  assert.equal(mock.getMockDossier("505", "normal").progressPercent, 100);
});

test("source loads more than 100 eligible rows per status using the same D8 mocks", async () => {
  const { loadMissingDossierRequirements } = await load("source.ts");
  assert.equal(typeof loadMissingDossierRequirements, "function");
  const rows = await loadMissingDossierRequirements("506");
  assert.equal(rows.filter((item) => item.status === "PENDING").length, 103);
  assert.equal(rows.filter((item) => item.status === "REQUESTED").length, 101);
  assert.equal(new Set(rows.map((item) => item.dossierRequirementId)).size, rows.length);
});

test("V5 central errors distinguish missing, locked, forbidden and expired session", async () => {
  const { mapMissingDocumentReminderError } = await load("lib/missing-document-reminder.ts");
  const error = (code, status) => ({ response: { status, data: { errorCode: code } } });
  const noMissing = mapMissingDocumentReminderError(error("NO_MISSING_DR", 400));
  assert.match(noMissing.message, /no longer need/); assert.equal(noMissing.refresh, true);
  assert.match(mapMissingDocumentReminderError(error("DOSSIER_LOCKED", 409), "BOOKING_CHANGE_IN_PROGRESS").message, /booking change/i);
  assert.match(mapMissingDocumentReminderError(error("FORBIDDEN", 403)).message, /permission to send document reminders/);
  assert.match(mapMissingDocumentReminderError(error("UNAUTHORIZED", 401)).message, /sign in/i);
});

test("actual V5 hook blocks duplicate submissions and invalidates D7 and all D8 queries, not U2", async () => {
  const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
  const { useMissingDocumentReminder } = await load("hooks/useMissingDocumentReminder.ts");
  const { dossierKeys } = await load("hooks/useDossier.ts");
  const { documentKeys } = await load("hooks/useComplianceDocument.ts");
  const client = new QueryClient();
  const keys = [dossierKeys.overview("501"), dossierKeys.requirements("501", { status: "PENDING" }), dossierKeys.requirements("501", { status: "REQUESTED", horseId: 71 }), dossierKeys.missingRequirements("501")];
  const documentKey = documentKeys.detail("9207");
  [...keys, documentKey].forEach((key) => client.setQueryData(key, {}));
  let controls;
  // oxlint-disable-next-line react/globals -- expose hook controls only to the Node SSR test.
  function Probe() { controls = useMissingDocumentReminder(); return null; }
  renderToStaticMarkup(React.createElement(QueryClientProvider, { client }, React.createElement(Probe)));
  try {
    const first = controls.sendReminder({ dossierId: "501", reminder: body });
    assert.deepEqual(await controls.sendReminder({ dossierId: "501", reminder: body }), { started: false });
    const result = await first;
    assert.equal(result.started, true); assert.equal(result.value.value.remindedCount, 2);
    assert.ok(keys.every((key) => client.getQueryState(key).isInvalidated));
    assert.equal(client.getQueryState(documentKey).isInvalidated, false);
  } finally { client.clear(); }
});

test("UC24 request stays readable and UC22 replacement fulfills it while retaining review history", async () => {
  const mock = await load("mocks/dossier.mock.ts");
  const before = mock.getMockComplianceDocument("9209", "normal");
  assert.ok(before.openRequest);
  const { DocumentRequestAlert } = await load("components/DocumentRequestAlert.tsx");
  const html = renderToStaticMarkup(React.createElement(DocumentRequestAlert, { request: before.openRequest }));
  assert.ok(html.includes(before.openRequest.requestCode)); assert.ok(html.includes(before.openRequest.message));
  const result = mock.submitMockDocumentVersion("9209", [new File(["page"], "corrected.pdf", { type: "application/pdf" })], { documentNumber: "UPDATED", expiryDate: "2099-10-01", issuedDate: "2026-10-01", issuingAuthority: "Veterinary Office" }, "normal");
  const after = mock.getMockComplianceDocument("9209", "normal");
  assert.equal(result.mode, "NEW_VERSION"); assert.equal(after.openRequest, null);
  assert.deepEqual(after.versions[1].review, before.versions[0].review);
});

test("UC23 approval increases mandatory completion but V4 remains a separate manual action", async () => {
  const mock = await load("mocks/dossier.mock.ts");
  const before = mock.getMockDossier("501", "normal");
  const doc = mock.getMockComplianceDocument("9207", "normal");
  mock.approveMockDocument("9207", doc.versions[0].documentVersionId, { result: "APPROVED" }, "normal");
  const after = mock.getMockDossier("501", "normal");
  assert.equal(after.mandatorySatisfiedOrWaived, before.mandatorySatisfiedOrWaived + 1);
  assert.ok(after.progressPercent > before.progressPercent); assert.equal(after.status, "IN_PREPARATION");
  assert.equal(mock.markMockDossierReady("504", "normal").code, 200);
  assert.equal(mock.getMockDossier("504", "normal").status, "READY_FOR_SUBMISSION");
  assert.equal(mock.getMockDossier("501", "normal").status, "IN_PREPARATION");
});

test("TS action mapping separates missing reminders from rejected DocumentRequest", async () => {
  const { getDossierRequirementActionLabels: actions } = await load("constants.ts");
  assert.deepEqual(actions("TRANSPORT_SPECIALIST", "PENDING", false), ["View Requirement", "Request Missing Document"]);
  assert.deepEqual(actions("TRANSPORT_SPECIALIST", "REQUESTED", false), ["View Requirement", "Send Reminder Again"]);
  assert.deepEqual(actions("TRANSPORT_SPECIALIST", "REJECTED", true), ["View Document", "View Review Result", "View Request"]);
  assert.ok(!actions("LOGISTICS_MANAGER", "PENDING", false).some((label) => label.includes("Reminder") || label.includes("Missing")));
});

test("owned row actions have no Soon placeholder and document tab reuses the document workflow", async () => {
  const ui = await readFile("src/features/dossier/components/DossierRequirementsPreview.tsx", "utf8");
  assert.doesNotMatch(ui, /Soon|not available in this phase/);
  for (const label of ["View Requirement", "View Request", "Request Missing Document", "Send Reminder Again", "RequestMissingDocumentsDialog", "DossierRequirementDetailsDialog"]) assert.ok(ui.includes(label), label);
  const page = await readFile("src/features/dossier/pages/DossierDetailsPage.tsx", "utf8");
  assert.doesNotMatch(page, /Document and review workflow will be available here/);
  assert.doesNotMatch(page, /getBooking|useBooking|bookingService|customerService/);
});

test("final temporary preview route stays DEV-only and local role injection never modifies authentication", async () => {
  const router = await readFile("src/app/router.tsx", "utf8");
  assert.match(router, /TEMP UC20-25 FINAL MANUAL UI TEST ROUTE — REMOVE AFTER TESTING/);
  assert.match(router, /END TEMP UC20-25 FINAL MANUAL UI TEST ROUTE/);
  assert.match(router, /const temporaryDossierRoutes = import\.meta\.env\.DEV/);
  const harness = await readFile("src/features/dossier/pages/DossierManualPreviewPage.tsx", "utf8");
  assert.match(harness, /dossierSourceKind !== "mock"/); assert.doesNotMatch(harness, /setAuth|clearAuth|setState/);
});

test("reminder summary renders D7 customer and selected documents without invented contact or delivery controls", async () => {
  const { MissingReminderPreview } = await load("components/RequestMissingDocumentsDialog.tsx");
  const mock = await load("mocks/dossier.mock.ts");
  const dossier = mock.getMockDossier("501", "normal");
  const selected = [mockRow(1), mockRow(2, "REQUESTED", 71)];
  const html = renderToStaticMarkup(React.createElement(MissingReminderPreview, {
    dossier, selected, dueDate: "2026-10-10", note: "Please submit the missing pages.",
  }));
  for (const text of [dossier.bookingSummary.customerName, dossier.bookingCode, "Requirement 1", "Requirement 2", "Pegaxus Star", "Email and Web Notification", "not the exact backend email template", "Please submit the missing pages."]) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /type="checkbox"|recipientEmail|deliveryChannels|Priority|Subject|@/);
});

test("real requirements UI exposes batch reminders only to TS with eligible data and never for locked or empty dossiers", async () => {
  const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
  const { DossierPreviewRoleContext } = await load("hooks/useDossierRole.ts");
  const { DossierRequirementsPreview } = await load("components/DossierRequirementsPreview.tsx");
  const { dossierKeys } = await load("hooks/useDossier.ts");
  const { initialDossierRequirementsParams, isMissingDossierRequirement } = await load("constants.ts");
  const mock = await load("mocks/dossier.mock.ts");
  for (const [id, role, expected] of [
    ["501", "TRANSPORT_SPECIALIST", true], ["501", "CUSTOMER", false],
    ["501", "LOGISTICS_MANAGER", false], ["502", "TRANSPORT_SPECIALIST", false],
    ["503", "TRANSPORT_SPECIALIST", false], ["505", "TRANSPORT_SPECIALIST", false],
  ]) {
    const client = new QueryClient();
    const dossier = mock.getMockDossier(id, "normal");
    const page = mock.getMockRequirements(id, initialDossierRequirementsParams, "normal");
    client.setQueryData(dossierKeys.requirements(id, initialDossierRequirementsParams), page);
    client.setQueryData(dossierKeys.missingRequirements(id), page.items.filter(isMissingDossierRequirement));
    try {
      const html = renderToStaticMarkup(React.createElement(QueryClientProvider, { client },
        React.createElement(DossierPreviewRoleContext.Provider, { value: role },
          React.createElement(DossierRequirementsPreview, { dossierId: id, dossier, horses: dossier.bookingSummary.horses }))));
      assert.equal(html.includes("Request Missing Documents"), expected, `${id}/${role}`);
      if (id === "502") assert.match(html, /No missing requirements need a reminder/);
    } finally { client.clear(); }
  }
});
