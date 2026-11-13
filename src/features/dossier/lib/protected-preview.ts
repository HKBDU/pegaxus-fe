import { env } from "@/lib/env";

// Only dossier preview paths may receive the authenticated API client's token.
export function getProtectedPreviewPath(path: string): string {
  // IDs are opaque strings (no UUID format required); no dots or slashes, so a segment can never be "." or "..".
  const id = "[A-Za-z0-9_-]+";
  const allowed = new RegExp(
    `^/api/v1/compliance-dossiers/${id}/requirements/${id}/versions/${id}(?:/attachments/${id})?/preview$`,
    "i",
  );
  if (!allowed.test(path))
    throw new Error("Invalid protected dossier preview path.");

  // Axios baseURL may be either the API origin or origin + /api/v1.
  // Keep the endpoint's /api/v1 prefix when the configured base does not have it.
  const basePath = new URL(env.API_URL, window.location.origin).pathname.replace(/\/$/, "");
  return basePath === "/api/v1" ? path.slice("/api/v1/".length) : path;
}
