import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadPureModule(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}

test("preview requests accept only dossier backend paths, never arbitrary token destinations", async () => {
  const { getProtectedPreviewPath } = await loadPureModule("./lib/protected-preview.ts");
  const id = "ca036bbe-7b1b-4f44-8e45-541ad12f990e";
  const path = `/api/v1/compliance-dossiers/${id}/requirements/${id}/versions/${id}/preview`;
  assert.equal(getProtectedPreviewPath(path), path.slice(8));
  assert.equal(getProtectedPreviewPath(path.replace("/preview", `/attachments/${id}/preview`)).endsWith("/preview"), true);
  for (const unsafe of ["https://evil.example/preview", "//evil.example/preview", "/api/v1/auth/login", `${path}?token=secret`, "javascript:alert(1)"]) {
    assert.throws(() => getProtectedPreviewPath(unsafe));
  }
});

test("preview UI fetches authenticated Blob and revokes its object URL without exposing backend href", async () => {
  const source = await readFile(new URL("./components/DocumentFilesPreview.tsx", import.meta.url), "utf8");
  assert.match(source, /responseType:\s*["']blob["']/);
  assert.match(source, /URL\.createObjectURL/);
  assert.match(source, /URL\.revokeObjectURL/);
  assert.doesNotMatch(source, /href=\{file\.fileUrl\}/);
});
