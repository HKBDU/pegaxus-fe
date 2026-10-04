import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const vite = await createServer({ server: { middlewareMode: true, hmr: false } });
after(async () => vite.close());

const pdf = () => new File(["page"], "page.pdf", { type: "application/pdf" });
const jpg = () => new File(["image"], "page.jpg", { type: "image/jpeg" });
const metadata = { documentNumber: "HP-1", issuingAuthority: "Weatherbys", issuedDate: "2025-03-01", expiryDate: "2027-03-01", uploadNote: "Clearer scan" };

const detail = {
  complianceDocumentId: 9209,
  documentCode: "DOC-20260925-0009",
  dossierRequirementId: 8109,
  documentName: "Import Declaration",
  status: "REJECTED",
  documentNumber: "HP-1",
  issuingAuthority: "Weatherbys",
  issuedDate: "2025-03-01",
  expiryDate: "2027-03-01",
  note: null,
  updatedAt: "2026-09-26T04:10:00Z",
  versions: [{ documentVersionId: 3300, versionNo: 1, uploadNote: null, uploadedAt: "2026-09-25T02:30:00Z", files: [{ fileName: "page.jpg", fileUrl: "https://example.com/page.jpg", mimeType: "image/jpeg", fileSizeBytes: 812345, sortOrder: 1 }], review: { documentReviewId: 900, result: "REJECTED", reviewComment: "Stamp is unclear", reviewedBy: { accountId: 402, fullName: "Reviewer" }, reviewedAt: "2026-09-26T04:10:00Z" } }],
  openRequest: { documentRequestId: 15, requestCode: "DREQ-20260926-0003", requestType: "REUPLOAD", message: "Upload a clearer scan", dueDate: "2026-10-05" },
};

test("customer actions separate initial upload, edit, update, and read-only states", async () => {
  const { getCustomerDocumentActions } = await vite.ssrLoadModule("/src/features/dossier/constants.ts");
  const base = { status: "IN_PREPARATION", writeLocked: false };
  const requirement = { status: "PENDING", document: null };
  assert.deepEqual(getCustomerDocumentActions(base, requirement), ["Upload Document"]);
  assert.deepEqual(getCustomerDocumentActions(base, { status: "PROVIDED", document: { status: "PROVIDED" } }), ["View Document", "Edit Document", "View Version History"]);
  assert.deepEqual(getCustomerDocumentActions(base, { status: "REJECTED", document: { status: "REJECTED" } }), ["View Document", "Update Document", "View Request", "View Version History"]);
  assert.deepEqual(getCustomerDocumentActions(base, { status: "SATISFIED", document: { status: "APPROVED" } }), ["View Document", "View Version History"]);
  assert.deepEqual(getCustomerDocumentActions({ ...base, writeLocked: true }, { status: "PROVIDED", document: { status: "PROVIDED" } }), ["View Document", "View Version History"]);
});

test("U2 parses versions, review, and open request without conflating their messages", async () => {
  const { complianceDocumentEnvelopeSchema } = await vite.ssrLoadModule("/src/features/dossier/schemas.ts");
  const parsed = complianceDocumentEnvelopeSchema.parse({ isSuccess: true, code: 200, message: "OK", value: detail }).value;
  assert.equal(parsed.versions[0].review.reviewComment, "Stamp is unclear");
  assert.equal(parsed.openRequest.message, "Upload a clearer scan");
  assert.equal(parsed.openRequest.dueDate, "2026-10-05");
});

test("U2, U3, and U4 use their contracts without computing version numbers", async () => {
  const { default: apiClient } = await vite.ssrLoadModule("/src/lib/axios.ts");
  const { dossierService } = await vite.ssrLoadModule("/src/features/dossier/services.ts");
  const previous = { get: apiClient.get, post: apiClient.post, patch: apiClient.patch };
  const calls = [];
  apiClient.get = async (url) => { calls.push({ method: "GET", url }); return { isSuccess: true, code: 200, message: "OK", value: detail }; };
  apiClient.post = async (url, body) => { calls.push({ method: "POST", url, body }); return { isSuccess: true, code: 201, message: "OK", value: { documentVersionId: 3301, versionNo: 7, mode: "NEW_VERSION" } }; };
  apiClient.patch = async (url, body) => { calls.push({ method: "PATCH", url, body }); return { isSuccess: true, code: 200, message: "OK", value: { complianceDocumentId: 9209, updatedAt: "2026-09-27T03:00:00Z" } }; };
  try {
    assert.equal((await dossierService.getComplianceDocument("9209")).openRequest.message, "Upload a clearer scan");
    const result = await dossierService.submitDocumentVersion({ documentId: "9209", files: [pdf(), jpg()], metadata });
    assert.equal(result.versionNo, 7);
    assert.equal(result.mode, "NEW_VERSION");
    assert.deepEqual(calls[1].body.getAll("files").map((file) => file.name), ["page.pdf", "page.jpg"]);
    assert.equal(calls[1].body.get("uploadNote"), "Clearer scan");
    assert.equal(calls[1].body.has("documentName"), false);
    assert.deepEqual(await dossierService.updateComplianceDocumentMetadata({ documentId: "9209", changes: { documentNumber: "HP-2" } }), { complianceDocumentId: 9209, updatedAt: "2026-09-27T03:00:00Z" });
    assert.deepEqual(calls[2].body, { documentNumber: "HP-2" });
    assert.deepEqual(calls.map((call) => `${call.method} ${call.url}`), ["GET compliance-documents/9209", "POST compliance-documents/9209/versions", "PATCH compliance-documents/9209"]);
  } finally {
    Object.assign(apiClient, previous);
  }
});

test("UC-22 invalidates U2, D8, and D7 through existing dossier keys", async () => {
  const { QueryClient } = await import("@tanstack/react-query");
  const { dossierKeys } = await vite.ssrLoadModule("/src/features/dossier/hooks/useDossier.ts");
  const { documentKeys, invalidateComplianceDocument } = await vite.ssrLoadModule("/src/features/dossier/hooks/useComplianceDocument.ts");
  const client = new QueryClient();
  const keys = [documentKeys.detail("9209"), dossierKeys.overview("501"), dossierKeys.requirements("501", { pageIndex: 1, pageSize: 20 })];
  for (const key of keys) client.setQueryData(key, {});
  await invalidateComplianceDocument(client, "9209", "501");
  assert.ok(keys.every((key) => client.getQueryState(key)?.isInvalidated));
});

test("mock PROVIDED edits in place, REJECTED creates server-owned version, and U4 preserves history", async () => {
  const mock = await vite.ssrLoadModule("/src/features/dossier/mocks/dossier.mock.ts");
  const providedBefore = mock.getMockComplianceDocument("9207", "normal");
  const metadataResult = mock.updateMockComplianceDocumentMetadata("9207", { documentNumber: "NEW-7" }, "normal");
  const providedAfterMetadata = mock.getMockComplianceDocument("9207", "normal");
  assert.equal(metadataResult.complianceDocumentId, 9207);
  assert.equal(providedAfterMetadata.versions.length, providedBefore.versions.length);
  assert.equal(providedAfterMetadata.versions[0].versionNo, providedBefore.versions[0].versionNo);
  const edit = mock.submitMockDocumentVersion("9207", [pdf(), jpg()], metadata, "normal");
  assert.equal(edit.mode, "EDIT_IN_PLACE");
  assert.equal(edit.versionNo, providedBefore.versions[0].versionNo);
  assert.equal(mock.getMockComplianceDocument("9207", "normal").versions[0].files.length, 2);
  const rejectedBefore = mock.getMockComplianceDocument("9209", "normal");
  const update = mock.submitMockDocumentVersion("9209", [pdf()], metadata, "normal");
  const rejectedAfter = mock.getMockComplianceDocument("9209", "normal");
  assert.equal(update.mode, "NEW_VERSION");
  assert.equal(rejectedAfter.versions.length, rejectedBefore.versions.length + 1);
  assert.equal(update.versionNo, rejectedAfter.versions[0].versionNo);
  assert.equal(rejectedAfter.openRequest, null);
  assert.equal(rejectedAfter.status, "PROVIDED");
});

test("revision notice keeps request details and previous review distinct", async () => {
  const { DocumentRevisionNotice } = await vite.ssrLoadModule("/src/features/dossier/components/DocumentSubmissionDialog.tsx");
  const html = renderToStaticMarkup(React.createElement(DocumentRevisionNotice, { document: detail }));
  assert.match(html, /Revision Request/);
  assert.match(html, /Upload a clearer scan/);
  assert.match(html, /Oct 2026/);
  assert.match(html, /Previous Review Comment/);
  assert.match(html, /Stamp is unclear/);
});

test("version history renders backend order, files, notes, and review", async () => {
  const { DocumentVersionHistory } = await vite.ssrLoadModule("/src/features/dossier/components/DocumentVersionHistory.tsx");
  const html = renderToStaticMarkup(React.createElement(DocumentVersionHistory, { versions: detail.versions }));
  assert.match(html, /Version v1/);
  assert.match(html, /page.jpg/);
  assert.match(html, /REJECTED/);
  assert.match(html, /Reviewer/);
  assert.match(html, /Stamp is unclear/);
});

test("reviewed and verified errors make write actions unavailable after refresh", async () => {
  const { mapComplianceDocumentError } = await vite.ssrLoadModule("/src/features/dossier/hooks/useComplianceDocument.ts");
  const error = (errorCode) => ({ response: { status: 409, data: { errorCode } } });
  assert.match(mapComplianceDocumentError(error("DOCUMENT_ALREADY_VERIFIED")).message, /read-only/);
  assert.equal(mapComplianceDocumentError(error("DOCUMENT_ALREADY_VERIFIED")).refresh, "requirements");
  assert.match(mapComplianceDocumentError(error("DOCUMENT_ALREADY_REVIEWED")).message, /Update Document/);
  assert.equal(mapComplianceDocumentError(error("DOCUMENT_EXPIRES_BEFORE_DEPARTURE")).field, "expiryDate");
});

test("U3 accepts backend edit-in-place response without increasing its version", async () => {
  const { default: apiClient } = await vite.ssrLoadModule("/src/lib/axios.ts");
  const { dossierService } = await vite.ssrLoadModule("/src/features/dossier/services.ts");
  const previous = apiClient.post;
  apiClient.post = async () => ({ isSuccess: true, code: 200, message: "OK", value: { documentVersionId: 3300, versionNo: 1, mode: "EDIT_IN_PLACE" } });
  try {
    const result = await dossierService.submitDocumentVersion({ documentId: "9207", files: [pdf()], metadata });
    assert.deepEqual(result, { documentVersionId: 3300, versionNo: 1, mode: "EDIT_IN_PLACE" });
  } finally {
    apiClient.post = previous;
  }
});

test("mock refuses metadata-only updates once a version is reviewed", async () => {
  const { updateMockComplianceDocumentMetadata } = await vite.ssrLoadModule("/src/features/dossier/mocks/dossier.mock.ts");
  assert.throws(() => updateMockComplianceDocumentMetadata("9202", { documentNumber: "NEW" }, "normal"), /DOCUMENT_ALREADY_REVIEWED/);
});

test("metadata-only submission sends only changed fields", async () => {
  const { getChangedDocumentMetadata } = await vite.ssrLoadModule("/src/features/dossier/hooks/useComplianceDocument.ts");
  const values = {
    documentName: detail.documentName,
    documentNumber: "HP-2",
    issuingAuthority: detail.issuingAuthority,
    issuedDate: detail.issuedDate,
    expiryDate: detail.expiryDate,
    note: "Correction",
    uploadNote: "This is not U4 metadata",
  };
  assert.deepEqual(getChangedDocumentMetadata(values, detail), { documentNumber: "HP-2", note: "Correction" });
});

test("UC-21 initial upload still uses U1 and groups files into v1", async () => {
  const { default: apiClient } = await vite.ssrLoadModule("/src/lib/axios.ts");
  const { dossierService } = await vite.ssrLoadModule("/src/features/dossier/services.ts");
  const previous = apiClient.post;
  const calls = [];
  apiClient.post = async (url, body) => {
    calls.push({ url, body });
    return { isSuccess: true, code: 201, message: "Created", value: { complianceDocumentId: 9300, documentCode: "DOC-9300", documentVersionId: 9400, versionNo: 1 } };
  };
  try {
    const result = await dossierService.uploadComplianceDocument({
      dossierId: "501", requirementId: 8106, files: [pdf(), jpg()],
      metadata: { documentName: "", documentNumber: "", issuingAuthority: "", issuedDate: "", expiryDate: "" },
    });
    assert.equal(result.versionNo, 1);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "compliance-dossiers/501/requirements/8106/documents");
    assert.equal(calls[0].body.getAll("files").length, 2);
  } finally {
    apiClient.post = previous;
  }
});

test("mock U1 preserves uploaded files and metadata when U2 opens the document", async () => {
  const mock = await vite.ssrLoadModule("/src/features/dossier/mocks/dossier.mock.ts");
  const files = [new File(["front"], "horse-front.pdf", { type: "application/pdf" }), jpg()];
  const result = mock.uploadMockDocument("501", 8106, files, "normal", {
    documentName: "Export Health Certificate", documentNumber: "EHC-22",
    issuingAuthority: "Veterinary Office", issuedDate: "2026-09-01", expiryDate: "2027-09-01",
  });
  const opened = mock.getMockComplianceDocument(String(result.complianceDocumentId), "normal");
  assert.equal(opened.documentNumber, "EHC-22");
  assert.equal(opened.issuingAuthority, "Veterinary Office");
  assert.deepEqual(opened.versions[0].files.map((file) => file.fileName), ["horse-front.pdf", "page.jpg"]);
});

test("mock U4 cannot overwrite document lifecycle fields", async () => {
  const mock = await vite.ssrLoadModule("/src/features/dossier/mocks/dossier.mock.ts");
  const before = mock.getMockComplianceDocument("9207", "normal");
  mock.updateMockComplianceDocumentMetadata("9207", { documentNumber: "SAFE", status: "APPROVED", versions: [] }, "normal");
  const after = mock.getMockComplianceDocument("9207", "normal");
  assert.equal(after.documentNumber, "SAFE");
  assert.equal(after.status, before.status);
  assert.deepEqual(after.versions, before.versions);
});

test("nested backend error codes keep reviewed documents read-only", async () => {
  const { mapComplianceDocumentError } = await vite.ssrLoadModule("/src/features/dossier/hooks/useComplianceDocument.ts");
  const mapped = mapComplianceDocumentError({ response: { status: 409, data: { data: { errorCode: "DOCUMENT_ALREADY_REVIEWED" } } } });
  assert.equal(mapped.code, "DOCUMENT_ALREADY_REVIEWED");
  assert.equal(mapped.refresh, "requirements");
});
