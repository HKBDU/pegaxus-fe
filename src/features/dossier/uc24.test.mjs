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
const request = { requestType: "REUPLOAD", message: "  Please upload a clearer scan of the full veterinary stamp.  ", dueDate: "2026-10-05" };
const review = { result: "REJECTED", reviewComment: "  Stamp is unclear.  ", documentRequest: request };
const metadata = { documentNumber: "CERT-24", issuingAuthority: "Veterinary Office", issuedDate: "2026-09-01", expiryDate: "2099-03-01", uploadNote: "Corrected scan" };
const pdf = () => new File(["page"], "clear-scan.pdf", { type: "application/pdf" });

test("V2 schema requires trimmed instructions of at least 15 characters and exact request types", async () => {
  const { rejectDocumentReviewSchema } = await load("schemas.ts");
  assert.ok(rejectDocumentReviewSchema, "V2 schema must be present");
  const parsed = rejectDocumentReviewSchema.parse(review);
  assert.equal(parsed.reviewComment, "Stamp is unclear.");
  assert.equal(parsed.documentRequest.message, request.message.trim());
  for (const message of ["", "   12345678901234   "]) {
    assert.equal(rejectDocumentReviewSchema.safeParse({ ...review, documentRequest: { ...request, message } }).success, false);
  }
  for (const requestType of ["MISSING_DOCUMENT", "REVISION", "REUPLOAD", "ADDITIONAL_INFORMATION"]) {
    assert.equal(rejectDocumentReviewSchema.safeParse({ ...review, documentRequest: { ...request, requestType } }).success, true);
  }
  assert.equal(rejectDocumentReviewSchema.safeParse({ ...review, documentRequest: { ...request, requestType: "UNCLEAR_IMAGE" } }).success, false);
  assert.equal(rejectDocumentReviewSchema.safeParse({ result: "REJECTED" }).success, false);
});

test("V2 omits blank optional fields and never sends generated fields or errorCategory", async () => {
  const { rejectDocumentReviewSchema } = await load("schemas.ts");
  assert.ok(rejectDocumentReviewSchema);
  const parsed = rejectDocumentReviewSchema.parse({ ...review, reviewComment: " ", errorCategory: "UNCLEAR_IMAGE", documentRequest: { ...request, dueDate: "", requestCode: "fake" } });
  assert.deepEqual(parsed, { result: "REJECTED", documentRequest: { requestType: "REUPLOAD", message: request.message.trim() } });
  assert.equal(rejectDocumentReviewSchema.safeParse({ ...review, documentRequest: { ...request, dueDate: "05/10/2026" } }).success, false);
  assert.equal(rejectDocumentReviewSchema.safeParse({ ...review, documentRequest: { ...request, dueDate: "2026-02-30" } }).success, false);
});

test("APPROVED V1 and REJECTED V2 use one review service endpoint", async () => {
  const { dossierService } = await load("services.ts");
  assert.equal(typeof dossierService.reviewComplianceDocument, "function");
  const { default: apiClient } = await vite.ssrLoadModule("/src/lib/axios.ts");
  const previous = apiClient.post;
  const calls = [];
  apiClient.post = async (url, body) => {
    calls.push({ url, body });
    return { isSuccess: true, code: 201, message: "Recorded", value: body.result === "APPROVED"
      ? { documentReviewId: 901, dossierRequirementStatus: "SATISFIED" }
      : { documentReviewId: 902, documentRequestId: 15, requestCode: "DREQ-24", dossierRequirementStatus: "REJECTED", dossierStatus: "IN_PREPARATION" } };
  };
  try {
    const input = { documentId: "9207", versionId: 10207, dossierId: "501" };
    const approved = await dossierService.approveDocument({ ...input, review: { result: "APPROVED" } });
    const rejected = await dossierService.reviewComplianceDocument({ ...input, review });
    assert.equal(approved.value.dossierRequirementStatus, "SATISFIED");
    assert.equal(rejected.value.dossierStatus, "IN_PREPARATION");
    assert.deepEqual(calls.map(({ url }) => url), Array(2).fill("compliance-documents/9207/versions/10207/reviews"));
    assert.equal(calls[1].body.documentRequest.message, request.message.trim());
    assert.equal(calls[1].body.documentRequest.dueDate, "2026-10-05");
    assert.equal("errorCategory" in calls[1].body, false);
    await assert.rejects(() => dossierService.reviewComplianceDocument({ ...input, review: { ...review, documentRequest: { ...request, message: "short" } } }));
    assert.equal(calls.length, 2);
  } finally { apiClient.post = previous; }
});

test("review eligibility keeps TS-only latest unreviewed PROVIDED document and lifecycle guards", async () => {
  const mock = await load("mocks/dossier.mock.ts");
  const { canReviewDocument } = await load("lib/document-review.ts");
  const dossier = mock.getMockDossier("501", "normal");
  const requirement = mock.getMockRequirements("501", {}, "normal").items.find((item) => item.dossierRequirementId === 8107);
  const document = mock.getMockComplianceDocument("9207", "normal");
  const context = { role: "TRANSPORT_SPECIALIST", dossier, requirement, document, today: "2026-10-02" };
  assert.equal(canReviewDocument(context), true);
  for (const role of ["CUSTOMER", "LOGISTICS_MANAGER", undefined]) assert.equal(canReviewDocument({ ...context, role }), false);
  assert.equal(canReviewDocument({ ...context, dossier: { ...dossier, writeLocked: true } }), false);
  assert.equal(canReviewDocument({ ...context, dossier: { ...dossier, status: "SUBMITTED" } }), false);
  assert.equal(canReviewDocument({ ...context, document: { ...document, status: "APPROVED" } }), false);
  assert.equal(canReviewDocument({ ...context, document: { ...document, versions: [{ ...document.versions[0], review: { result: "REJECTED" } }] } }), false);
});

test("V2 errors retain friendly validation and stale-data refresh behavior", async () => {
  const { mapDocumentReviewError } = await load("lib/document-review.ts");
  assert.match(mapDocumentReviewError({ response: { status: 400, data: { errorCode: "REQUEST_MESSAGE_TOO_SHORT" } } }).message, /15 characters/);
  assert.match(mapDocumentReviewError({ response: { status: 400, data: { errorCode: "DOCUMENT_REQUEST_REQUIRED" } } }).message, /document request/i);
  for (const code of ["VERSION_NOT_LATEST", "VERSION_ALREADY_REVIEWED", "DOSSIER_LOCKED", "BOOKING_CHANGE_IN_PROGRESS", "DOSSIER_CLOSED"]) {
    const mapped = mapDocumentReviewError({ response: { status: 409, data: { value: { errorCode: code }, message: "Backend detail" } } });
    assert.equal(mapped.code, code);
    assert.equal(mapped.refresh, true);
    assert.equal(mapped.backendMessage, "Backend detail");
  }
  for (const [status, code] of [[403, "FORBIDDEN"], [404, "NOT_FOUND"]]) {
    assert.equal(mapDocumentReviewError({ response: { status } }).code, code);
  }
  assert.match(mapDocumentReviewError({ response: { status: 400, data: { errorCode: "VALIDATION_ERROR", value: { errors: [{ field: "message", message: "Detailed instructions required" }] } } } }).message, /Detailed instructions/);
});

test("invalid, locked, missing, or stale review attempts cannot mutate mock state", async () => {
  const mock = await load("mocks/dossier.mock.ts");
  assert.equal(typeof mock.reviewMockDocument, "function");
  const before = mock.getMockComplianceDocument("9207", "normal");
  assert.throws(() => mock.reviewMockDocument("9207", before.versions[0].documentVersionId, { ...review, documentRequest: { ...request, message: "short" } }, "normal"));
  assert.throws(() => mock.reviewMockDocument("9207", before.versions[0].documentVersionId, review, "locked"), /DOSSIER_LOCKED/);
  assert.throws(() => mock.reviewMockDocument("9207", 123, review, "normal"), /VERSION_NOT_LATEST/);
  assert.throws(() => mock.reviewMockDocument("99999", 123, review, "normal"), /DOCUMENT_NOT_FOUND/);
  assert.deepEqual(mock.getMockComplianceDocument("9207", "normal"), before);
});

test("UC-23 still blocks invalid expiry, missing versions and mismatched requirement context", async () => {
  const mock = await load("mocks/dossier.mock.ts");
  const { getReviewBlockReason } = await load("lib/document-review.ts");
  const context = { role: "TRANSPORT_SPECIALIST", dossier: mock.getMockDossier("501", "normal"),
    requirement: mock.getMockRequirements("501", {}, "normal").items.find((item) => item.dossierRequirementId === 8107),
    document: mock.getMockComplianceDocument("9207", "normal"), today: "2026-10-02" };
  assert.equal(getReviewBlockReason({ ...context, document: { ...context.document, expiryDate: "2025-01-01" } }).code, "DOCUMENT_EXPIRY_INVALID");
  assert.equal(getReviewBlockReason({ ...context, document: { ...context.document, expiryDate: null } }).code, "DOCUMENT_EXPIRY_INVALID");
  assert.equal(getReviewBlockReason({ ...context, document: { ...context.document, versions: [] } }).code, "NO_DOCUMENT_VERSION");
  assert.equal(getReviewBlockReason({ ...context, document: { ...context.document, dossierRequirementId: 123 } }).code, "DOCUMENT_NOT_REVIEWABLE");
});

test("V2 can request a correction of invalid legacy expiry without overriding V1 approval validation", async () => {
  const mock = await load("mocks/dossier.mock.ts");
  const { canReviewDocument } = await load("lib/document-review.ts");
  const context = { role: "TRANSPORT_SPECIALIST", dossier: mock.getMockDossier("501", "normal"),
    requirement: mock.getMockRequirements("501", {}, "normal").items.find((item) => item.dossierRequirementId === 8107),
    document: { ...mock.getMockComplianceDocument("9207", "normal"), expiryDate: "2025-01-01" }, today: "2026-10-02" };
  assert.equal(canReviewDocument({ ...context, result: "REJECTED" }), true);
  assert.equal(canReviewDocument({ ...context, result: "APPROVED" }), false);
});

test("V2 mock records rejection/request, D7 counts, and U3 fulfills request without losing review history", async () => {
  const mock = await load("mocks/dossier.mock.ts");
  assert.equal(typeof mock.reviewMockDocument, "function");
  const before = mock.getMockDossier("501", "normal");
  const doc = mock.getMockComplianceDocument("9207", "normal");
  const result = mock.reviewMockDocument("9207", doc.versions[0].documentVersionId, review, "normal");
  const rejected = mock.getMockComplianceDocument("9207", "normal");
  const overview = mock.getMockDossier("501", "normal");
  const row = mock.getMockRequirements("501", {}, "normal").items.find((item) => item.dossierRequirementId === 8107);
  assert.equal(result.code, 201);
  assert.equal(result.value.dossierStatus, "IN_PREPARATION");
  assert.equal(rejected.status, "REJECTED");
  assert.equal(row.status, "REJECTED");
  assert.equal(overview.status, "IN_PREPARATION");
  const recorded = rejected.versions[0].review;
  assert.equal(recorded.result, "REJECTED");
  assert.equal(recorded.reviewComment, "Stamp is unclear.");
  assert.equal(recorded.reviewedBy.fullName, "Transport Specialist");
  assert.ok(!Number.isNaN(Date.parse(recorded.reviewedAt)));
  assert.equal(rejected.openRequest.documentRequestId, result.value.documentRequestId);
  assert.equal(rejected.openRequest.requestCode, result.value.requestCode);
  assert.equal(rejected.openRequest.message, request.message.trim());
  assert.equal(rejected.openRequest.dueDate, request.dueDate);
  assert.equal(overview.requirementSummary.provided, before.requirementSummary.provided - 1);
  assert.equal(overview.requirementSummary.rejected, before.requirementSummary.rejected + 1);
  assert.equal(overview.requirementSummary.total, before.requirementSummary.total);
  assert.equal(overview.mandatorySatisfiedOrWaived, before.mandatorySatisfiedOrWaived);
  assert.equal(overview.progressPercent, before.progressPercent);
  assert.throws(() => mock.reviewMockDocument("9207", doc.versions[0].documentVersionId, review, "normal"), /VERSION_ALREADY_REVIEWED/);
  const update = mock.submitMockDocumentVersion("9207", [pdf()], metadata, "normal");
  const corrected = mock.getMockComplianceDocument("9207", "normal");
  assert.equal(update.mode, "NEW_VERSION");
  assert.equal(corrected.status, "PROVIDED");
  assert.equal(corrected.openRequest, null);
  assert.equal(corrected.versions[0].review, null);
  assert.deepEqual(corrected.versions[1].review, recorded);
  assert.equal(mock.getMockRequirements("501", {}, "normal").items.find((item) => item.dossierRequirementId === 8107).status, "PROVIDED");
});

test("V1 approval and separate V4 remain intact, then V2 returns a ready dossier to preparation", async () => {
  const mock = await load("mocks/dossier.mock.ts");
  assert.equal(typeof mock.reviewMockDocument, "function");
  const existing = mock.getMockComplianceDocument("9207", "normal");
  mock.approveMockDocument("9207", existing.versions[0].documentVersionId, { result: "APPROVED" }, "normal");
  assert.equal(mock.getMockComplianceDocument("9207", "normal").status, "APPROVED");
  assert.equal(mock.getMockDossier("501", "normal").status, "IN_PREPARATION");
  for (const requirementId of [8106, 8108]) {
    const uploaded = mock.uploadMockDocument("501", requirementId, [pdf()], "normal", { ...metadata, documentName: "Certificate" });
    mock.approveMockDocument(String(uploaded.complianceDocumentId), uploaded.documentVersionId, { result: "APPROVED" }, "normal");
  }
  const corrected = mock.submitMockDocumentVersion("9209", [pdf()], metadata, "normal");
  const ready = mock.markMockDossierReady("501", "normal");
  assert.equal(ready.code, 200);
  assert.equal(mock.getMockDossier("501", "normal").status, "READY_FOR_SUBMISSION");
  const response = mock.reviewMockDocument("9209", corrected.documentVersionId, { result: "REJECTED", documentRequest: { requestType: "REVISION", message: "Please correct the document reference number." } }, "normal");
  const overview = mock.getMockDossier("501", "normal");
  assert.equal(response.value.dossierStatus, "IN_PREPARATION");
  assert.equal(overview.status, "IN_PREPARATION");
  assert.equal(overview.mandatorySatisfiedOrWaived, 8);
  assert.equal(overview.progressPercent, 100);
  assert.equal(mock.getMockComplianceDocument("9209", "normal").openRequest.dueDate, null);
});

test("Customer request alert shows code, friendly type, instructions, optional date, and an action slot", async () => {
  const { DocumentRequestAlert } = await load("components/DocumentRequestAlert.tsx");
  const props = { request: { documentRequestId: 15, requestCode: "DREQ-24", ...request, message: request.message.trim() }, action: React.createElement("button", null, "Update Document") };
  const html = renderToStaticMarkup(React.createElement(DocumentRequestAlert, props));
  for (const text of ["DREQ-24", "Re-upload Document", "Please upload", "Oct 2026", "Update Document"]) assert.ok(html.includes(text));
  const noDate = renderToStaticMarkup(React.createElement(DocumentRequestAlert, { ...props, request: { ...props.request, dueDate: null } }));
  assert.equal(noDate.includes("Revision Deadline"), false);
});

test("review mutations keep the common invalidation and guard, Customer update reuses U3", async () => {
  const hook = await readFile("src/features/dossier/hooks/useDocumentReview.ts", "utf8");
  assert.match(hook, /loadDocumentReview/);
  assert.match(hook, /createRequestAttemptGuard/);
  assert.match(hook, /invalidateComplianceDocument/);
  const { createRequestAttemptGuard } = await vite.ssrLoadModule("/src/shared/hooks/request-attempt-guard.ts");
  const guard = createRequestAttemptGuard();
  let finish;
  const first = guard.run(() => new Promise((resolve) => { finish = resolve; }));
  assert.deepEqual(await guard.run(() => Promise.resolve("duplicate")), { started: false });
  finish("done");
  assert.deepEqual(await first, { started: true, value: "done" });
  const preview = await readFile("src/features/dossier/components/DossierRequirementsPreview.tsx", "utf8");
  assert.match(preview, /onUpdate/);
  assert.match(preview, /mode: "update"/);
  const { QueryClient } = await import("@tanstack/react-query");
  const { documentKeys, invalidateComplianceDocument } = await load("hooks/useComplianceDocument.ts");
  const { dossierKeys } = await load("hooks/useDossier.ts");
  const client = new QueryClient();
  const keys = [documentKeys.detail("9207"), dossierKeys.overview("501"), dossierKeys.requirements("501", { status: "PROVIDED", horseId: 72 }), dossierKeys.requirements("501", { status: "REJECTED" })];
  keys.forEach((key) => client.setQueryData(key, {}));
  await invalidateComplianceDocument(client, "9207", "501");
  assert.ok(keys.every((key) => client.getQueryState(key).isInvalidated));
  client.clear();
});

test("temporary manual route is DEV-only, explicit-mock-only and cannot mutate global authentication", async () => {
  const router = await readFile("src/app/router.tsx", "utf8");
  assert.match(router, /\/\/ TEMP UC20-24 MANUAL UI TEST ROUTE — REMOVE AFTER TESTING/);
  assert.match(router, /\/\/ END TEMP UC20-24 MANUAL UI TEST ROUTE/);
  assert.match(router, /import\.meta\.env\.DEV/);
  assert.match(router, /\/dev\/dossier\/:dossierId/);
  const harness = await readFile("src/features/dossier/pages/DossierManualPreviewPage.tsx", "utf8");
  assert.match(harness, /TEMP UC20-24 MANUAL UI TEST HARNESS/);
  assert.match(harness, /dossierSourceKind !== "mock"/);
  assert.match(harness, /previewRole/);
  assert.doesNotMatch(harness, /setAuth|setState|clearAuth/);
  const { resolveDossierSource } = await load("source.ts");
  assert.equal(resolveDossierSource(false, "true"), "api");
  assert.equal(resolveDossierSource(true, undefined), "api");
});

test("preview roles stay local to the dossier context and leave AuthStore unchanged", async () => {
  const { DossierPreviewRoleContext, useDossierRole } = await load("hooks/useDossierRole.ts");
  const { useAuthStore } = await vite.ssrLoadModule("/src/features/auth/store.ts");
  const before = useAuthStore.getState();
  function RoleProbe() { return React.createElement("span", null, useDossierRole()); }
  for (const role of ["CUSTOMER", "TRANSPORT_SPECIALIST", "LOGISTICS_MANAGER"]) {
    const html = renderToStaticMarkup(React.createElement(DossierPreviewRoleContext.Provider, { value: role }, React.createElement(RoleProbe)));
    assert.equal(html, `<span>${role}</span>`);
  }
  const unknown = renderToStaticMarkup(React.createElement(DossierPreviewRoleContext.Provider, { value: "UNKNOWN" }, React.createElement(RoleProbe)));
  assert.equal(unknown, "<span></span>");
  assert.ok(useAuthStore.getState() === before, "Preview must not change authentication state");
});

test("actual review hook rejects once through the mock source and invalidates every dossier projection", async () => {
  const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
  const { useDocumentReview } = await load("hooks/useDocumentReview.ts");
  const { dossierKeys } = await load("hooks/useDossier.ts");
  const { documentKeys } = await load("hooks/useComplianceDocument.ts");
  const mock = await load("mocks/dossier.mock.ts");
  const uploaded = mock.uploadMockDocument("501", 8110, [pdf()], "normal", { ...metadata, documentName: "Insurance Confirmation" });
  const id = String(uploaded.complianceDocumentId);
  const client = new QueryClient();
  const keys = [documentKeys.detail(id), dossierKeys.overview("501"), dossierKeys.requirements("501", { status: "PROVIDED" }), dossierKeys.requirements("501", { status: "REJECTED" })];
  keys.forEach((key) => client.setQueryData(key, {}));
  let controls;
  const pending = [];
  // oxlint-disable-next-line react/globals -- SSR probe exposes hook controls to this test only; it never renders application state.
  function HookProbe() { controls = useDocumentReview((value) => pending.push(value)); return null; }
  renderToStaticMarkup(React.createElement(QueryClientProvider, { client }, React.createElement(HookProbe)));
  try {
    const input = { documentId: id, versionId: uploaded.documentVersionId, dossierId: "501", review };
    const first = controls.reject(input);
    assert.deepEqual(await controls.reject(input), { started: false });
    const result = await first;
    assert.equal(result.started, true);
    assert.equal(result.value.value.dossierRequirementStatus, "REJECTED");
    assert.ok(keys.every((key) => client.getQueryState(key).isInvalidated));
    assert.deepEqual(pending, [true, false]);
    assert.equal(mock.getMockComplianceDocument(id, "normal").versions[0].review.result, "REJECTED");
  } finally { client.clear(); }
});

test("manual preview renders the real D7/D8 page for all roles and keeps readiness TS-only", async () => {
  const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
  const { MemoryRouter, Routes, Route } = await import("react-router-dom");
  const { default: Preview } = await load("pages/DossierManualPreviewPage.tsx");
  const { dossierKeys } = await load("hooks/useDossier.ts");
  const { initialDossierRequirementsParams } = await load("constants.ts");
  const mock = await load("mocks/dossier.mock.ts");
  for (const role of ["CUSTOMER", "TRANSPORT_SPECIALIST", "LOGISTICS_MANAGER"]) {
    const client = new QueryClient();
    client.setQueryData(dossierKeys.overview("501"), mock.getMockDossier("501", "normal"));
    client.setQueryData(dossierKeys.requirements("501", initialDossierRequirementsParams), mock.getMockRequirements("501", initialDossierRequirementsParams, "normal"));
    try {
      const routes = React.createElement(Routes, null, React.createElement(Route, {
        path: "/dev/dossier/:dossierId", element: React.createElement(Preview),
      }));
      const page = React.createElement(MemoryRouter, { initialEntries: [`/dev/dossier/501?previewRole=${role}`] }, routes);
      const html = renderToStaticMarkup(React.createElement(QueryClientProvider, { client }, page));
      assert.ok(html.includes("COMPLIANCE DOSSIER"));
      assert.ok(html.includes("Pegaxus Star"));
      assert.ok(html.includes("Silver Arrow"));
      assert.equal(html.includes("Mark Ready for Submission"), role === "TRANSPORT_SPECIALIST");
    } finally { client.clear(); }
  }
});

test("UC-24 adds no separate fulfill, chat, revoke, reminder, or notification endpoint", async () => {
  const service = await readFile("src/features/dossier/services.ts", "utf8");
  assert.equal((service.match(/\/reviews`/g) ?? []).length, 1);
  assert.doesNotMatch(service, /(?:document-requests|reminders|revoke|fulfill|notifications|sendEmail)/i);
  const source = await readFile("src/features/dossier/source.ts", "utf8");
  assert.doesNotMatch(source, /catch[\s\S]*getMock/);
});
