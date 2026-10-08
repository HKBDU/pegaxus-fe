// Only dossier preview paths may receive the authenticated API client's token.
export function getProtectedPreviewPath(path: string): string {
  const id = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
  const allowed = new RegExp(
    `^/api/v1/compliance-dossiers/${id}/requirements/${id}/versions/${id}(?:/attachments/${id})?/preview$`,
    "i",
  );
  if (!allowed.test(path))
    throw new Error("Invalid protected dossier preview path.");
  return path.slice(8);
}
