import { createContext, useContext } from "react";
import { normalizeRole } from "@/features/auth/access-control";
import { useAuthStore } from "@/features/auth/store";
import { dossierSourceKind } from "../source";

// Feature-local preview only. Never writes authentication or grants access to API mode.
export const DossierPreviewRoleContext = createContext<string | undefined>(
  undefined,
);

export function useDossierRole(preferredRole?: string) {
  const previewRole = useContext(DossierPreviewRoleContext);
  const roles = useAuthStore((state) => state.principal?.roles)?.map(
    normalizeRole,
  );
  if (
    import.meta.env.DEV &&
    dossierSourceKind === "mock" &&
    previewRole &&
    ["CUSTOMER", "TRANSPORT_SPECIALIST", "LOGISTICS_MANAGER"].includes(
      previewRole,
    )
  )
    return previewRole;
  return (
    (preferredRole
      ? roles?.find((role) => role === preferredRole)
      : undefined) ??
    roles?.find((role) =>
      ["CUSTOMER", "TRANSPORT_SPECIALIST", "LOGISTICS_MANAGER"].includes(role),
    )
  );
}
