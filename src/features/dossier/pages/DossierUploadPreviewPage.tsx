import { useState } from "react";
import { ErrorState, LoadingState } from "@/shared/components/common";
import { DossierStatusBadge } from "../components/DossierStatusBadge";
import { RequirementTable } from "../components/DossierRequirementsPreview";
import { UploadComplianceDocumentDialog } from "../components/UploadComplianceDocumentDialog";
import { initialDossierRequirementsParams } from "../constants";
import { useDossierOverview, useDossierRequirements } from "../hooks/useDossier";
import type { DossierRequirement } from "../types";

const previewDossierId = "501";

export default function DossierUploadPreviewPage() {
  const [selectedRequirement, setSelectedRequirement] = useState<DossierRequirement | null>(null);
  const dossierQuery = useDossierOverview(previewDossierId);
  const requirementsQuery = useDossierRequirements(previewDossierId, initialDossierRequirementsParams);
  const dossier = dossierQuery.data;
  const requirements = requirementsQuery.data;

  return (
    <div className="booking-page-shell min-h-[calc(100svh-3rem)] px-5 py-6 font-sans sm:px-6 lg:px-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1152px] space-y-5">
        <header className="space-y-2">
          <span className="inline-flex rounded-[2px] border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800">Development preview · Mock data only</span>
          <h1 className="m-0! font-heading text-3xl! font-bold! uppercase text-primary!">Compliance document upload</h1>
          <p className="text-sm text-slate-600">No sign-in or backend request is needed. Open the actions menu on a pending requirement and choose Upload Document.</p>
        </header>

        {dossierQuery.isPending || requirementsQuery.isPending ? <LoadingState /> : null}
        {dossierQuery.isError || requirementsQuery.isError ? (
          <ErrorState message="Could not load the mock dossier. Check that VITE_DOSSIER_API_MOCKS=true and VITE_DOSSIER_MOCK_SCENARIO=normal." />
        ) : null}
        {dossier && requirements ? (
          <section className="space-y-3" aria-label="Mock dossier requirements">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-slate-900">{dossier.dossierCode}</span>
              <DossierStatusBadge status={dossier.status} />
              <span className="text-slate-500">Try Export Health Certificate or Microchip Certificate.</span>
            </div>
            <RequirementTable
              items={requirements.items}
              role="CUSTOMER"
              dossier={dossier}
              onUpload={setSelectedRequirement}
            />
            <UploadComplianceDocumentDialog
              key={selectedRequirement?.dossierRequirementId ?? "closed"}
              dossier={dossier}
              requirement={selectedRequirement}
              role="CUSTOMER"
              onClose={() => setSelectedRequirement(null)}
            />
          </section>
        ) : null}
      </div>
    </div>
  );
}
