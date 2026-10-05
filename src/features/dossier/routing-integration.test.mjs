import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("real dossier routes live in existing role layouts and have no unauthenticated preview entry", async () => {
  const router = await readFile(new URL("../../app/router.tsx", import.meta.url), "utf8");
  assert.match(router, /path: "compliance-dossiers\/:dossierId"/);
  assert.match(router, /path: ":dossierId\/details"/);
  assert.doesNotMatch(router, /temporaryDossierRoutes|\/dev\/dossier/);
  const page = await readFile(new URL("./pages/DossierDetailsPage.tsx", import.meta.url), "utf8");
  assert.match(page, /useParams/);
  assert.doesNotMatch(page, /location\.state|DossierRequirementsPanel/);
});

test("OPEN requests and authenticated detail/history are reachable after document status changes", async () => {
  const detail = await readFile(new URL("./components/DocumentVersionHistory.tsx", import.meta.url), "utf8");
  assert.match(detail, /useDocumentVersions/);
  assert.match(detail, /DocumentRequestComments/);
  assert.match(detail, /RevokeDocumentReviewDialog/);
  const table = await readFile(new URL("./components/DossierRequirementsPreview.tsx", import.meta.url), "utf8");
  assert.match(table, /item\.openRequest\?\.status === "OPEN"/);
  assert.doesNotMatch(table, /parse\(Number\(horseId\)\)/);
});

test("request comments exclude LM and remain writable for OPEN requests after dossier locking", async () => {
  const detail = await readFile(new URL("./components/DocumentVersionHistory.tsx", import.meta.url), "utf8");
  const requirement = await readFile(new URL("./components/DossierRequirementDetailsDialog.tsx", import.meta.url), "utf8");
  for (const source of [detail, requirement]) {
    assert.match(source, /canReadComments=\{role === "CUSTOMER" \|\| role === "TRANSPORT_SPECIALIST"\}/);
    assert.match(source, /canComment=\{\(role === "CUSTOMER" \|\| role === "TRANSPORT_SPECIALIST"\) && request.status === "OPEN"\}/);
  }
  const comments = await readFile(new URL("./components/DocumentRequestComments.tsx", import.meta.url), "utf8");
  assert.match(comments, /useDocumentRequestComments\(dossierId, requirementId, String\(request.documentRequestId\), canReadComments\)/);
});
