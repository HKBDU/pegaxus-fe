import { useState } from "react";
import { ErrorState, LoadingState } from "@/shared/components/common";
import { DossierStatusBadge } from "../components/DossierStatusBadge";
import { RequirementTable } from "../components/DossierRequirementsPreview";
import { DocumentSubmissionDialog } from "../components/DocumentSubmissionDialog";
import { DocumentDetailsDialog } from "../components/DocumentVersionHistory";
import { initialDossierRequirementsParams } from "../constants";
import { useDossierOverview, useDossierRequirements } from "../hooks/useDossier";
import type { DossierRequirement } from "../types";

const previewDossierId = "501";

export default function DossierUploadPreviewPage() {
  const [submission, setSubmission] = useState<{ requirement: DossierRequirement; mode: "initial" | "edit" | "update" } | null>(null);
  const [viewDocumentId, setViewDocumentId] = useState<string | null>(null);
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
          <p className="text-sm text-slate-600">Dossier business data uses mocks. File upload uses the real presigned backend and requires a valid session. Mock file previews show local demonstration assets. Open the actions menu on a pending requirement and choose Upload Document.</p>
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
              onAction={(item, label) => {
                if (label === "View Document" || label === "View Version History") {
                  if (item.document) setViewDocumentId(String(item.document.complianceDocumentId));
                } else if (label === "Upload Document") setSubmission({ requirement: item, mode: "initial" });
                else if (label === "Edit Document") setSubmission({ requirement: item, mode: "edit" });
                else if (label === "Update Document") setSubmission({ requirement: item, mode: "update" });
              }}
            />
            <DocumentSubmissionDialog
              key={submission ? `${submission.mode}-${submission.requirement.dossierRequirementId}` : "closed"}
              dossier={dossier}
              requirement={submission?.requirement ?? null}
              mode={submission?.mode ?? "initial"}
              role="CUSTOMER"
              onClose={() => setSubmission(null)}
            />
            <DocumentDetailsDialog documentId={viewDocumentId} onClose={() => setViewDocumentId(null)} />
          </section>
        ) : null}
      </div>
    </div>
  );
}
