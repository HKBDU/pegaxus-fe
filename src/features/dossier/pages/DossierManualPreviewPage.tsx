// TEMP UC20-25 FINAL MANUAL UI TEST HARNESS.
// DELETE THIS FILE AFTER MANUAL UI TESTING.
import { Link, useSearchParams } from "react-router-dom";
import { ErrorState } from "@/shared/components/common";
import { Button } from "@/shared/components/ui/button";
import { DossierPreviewRoleContext } from "../hooks/useDossierRole";
import { dossierSourceKind } from "../source";
import DossierDetailsPage from "./DossierDetailsPage";
import { DOSSIER_MOCK_SCENARIOS } from "../mocks/dossier.mock";

const previewRoles = ["CUSTOMER", "TRANSPORT_SPECIALIST", "LOGISTICS_MANAGER"] as const;

export default function DossierManualPreviewPage() {
  const [search] = useSearchParams();
  if (!import.meta.env.DEV || dossierSourceKind !== "mock") {
    return <ErrorState message="This temporary preview requires local development and VITE_DOSSIER_API_MOCKS=true. Restart the dev server after setting the flag. Dossier queries use mocks; file uploads use the real presigned backend." />;
  }
  const role = previewRoles.find((value) => value === search.get("previewRole")) ?? "CUSTOMER";
  return (
    <DossierPreviewRoleContext.Provider value={role}>
      <div className="border-b border-primary/20 bg-primary/5 px-5 py-3 text-sm">
        <p className="font-semibold">Temporary UC20–25 preview · Explicit mock data only · {role}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {previewRoles.map((previewRole) => {
            const params = new URLSearchParams(search);
            params.set("previewRole", previewRole);
            return <Button key={previewRole} asChild variant={role === previewRole ? "default" : "outline"} size="sm" className="rounded-[2px]"><Link to={`?${params}`}>{previewRole.replaceAll("_", " ")}</Link></Button>;
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Mock scenarios">
          {DOSSIER_MOCK_SCENARIOS.map(({ id, label }) => <Button key={id} asChild variant="outline" size="sm" className="h-auto whitespace-normal rounded-[2px] text-left text-xs"><Link to={`/dev/dossier/${id}?${search}`}>{id} · {label}</Link></Button>)}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Mock changes stay in memory across role switches. Reload to reset fixtures. No sign-in is needed for dossier viewing, review or reminders. File upload requires the real presigned backend and a valid session; file previews show local demonstration assets.</p>
      </div>
      <DossierDetailsPage key={role} />
    </DossierPreviewRoleContext.Provider>
  );
}
