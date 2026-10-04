import { useState } from "react";
import {
  ArrowLeft,
  ClipboardList,
  FileText,
  History,
  ShieldCheck,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/shared/components/common";
import { PageHeader } from "@/shared/components/PageHeader";
import { Card, CardContent } from "@/shared/components/ui/card";
import { DossierOverview } from "../components/DossierOverview";
import { DossierReadinessAction } from "../components/DossierReadinessAction";
import { DossierRequirementsPreview } from "../components/DossierRequirementsPreview";
import { useDossierOverview } from "../hooks/useDossier";
import { getDossierLoadErrorKind } from "../source";

const sections = [
  { id: "requirements", label: "Dossier Requirements", icon: ClipboardList },
  { id: "documents", label: "Documents / Reviews", icon: FileText },
  { id: "authority", label: "Authority & Inspection", icon: ShieldCheck },
  { id: "audit", label: "Audit History", icon: History },
] as const;
type SectionId = (typeof sections)[number]["id"];

const integrationMessages: Record<
  Exclude<SectionId, "requirements" | "documents">,
  string
> = {
  authority: "Authority and inspection module integration pending.",
  audit: "Audit history integration pending.",
};

function QueryError({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  const kind = getDossierLoadErrorKind(error);
  const messages = {
    unauthorized: "Your session has expired. Please sign in again.",
    forbidden: "You do not have permission to view this dossier.",
    "not-found":
      "This compliance dossier was not found or has not been initialized.",
    contract: "The dossier response does not match the expected data contract.",
    load: "Unable to load dossier information. Please try again.",
  };
  return (
    <ErrorState
      message={messages[kind]}
      onRetry={kind === "load" ? onRetry : undefined}
    />
  );
}

export default function DossierDetailsPage() {
  const { dossierId = "" } = useParams<{ dossierId: string }>();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<SectionId>("requirements");
  const query = useDossierOverview(dossierId);
  return (
    <div className="booking-page-shell min-w-0 px-5 py-6 font-sans sm:px-6 lg:px-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1440px] space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-[6px] pt-2 text-[12px] font-bold leading-4 tracking-[0.6px] text-primary uppercase hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              <ArrowLeft aria-hidden="true" className="size-3.5" /> Back to
              Booking
            </button>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <PageHeader
                title="COMPLIANCE DOSSIER"
                backHref="/"
                showBack={false}
                className="w-auto"
              />
              
            </div>
            <p className="text-xs text-gray-600 sm:text-sm">
              Manage legal and regulatory documents for this transport booking.
            </p>
          </div>
        </header>
        {query.invalidId ? (
          <ErrorState message="A valid dossier ID is required." />
        ) : query.isPending ? (
          <LoadingState />
        ) : query.isError ? (
          <QueryError
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : query.data ? (
          <>
            <DossierOverview dossier={query.data} />
            <DossierReadinessAction dossier={query.data} />
            <div className="border-b border-gray-200">
              <div
                role="tablist"
                aria-label="Dossier sections"
                className="flex gap-1 overflow-x-auto"
              >
                {sections.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    id={`dossier-tab-${id}`}
                    type="button"
                    role="tab"
                    aria-selected={activeSection === id}
                    aria-controls={`dossier-panel-${id}`}
                    onClick={() => setActiveSection(id)}
                    className={`inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 font-heading text-xs font-semibold uppercase transition-colors focus-visible:outline-2 focus-visible:outline-primary ${activeSection === id ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-900"}`}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div
              role="tabpanel"
              id={`dossier-panel-${activeSection}`}
              aria-labelledby={`dossier-tab-${activeSection}`}
            >
              {activeSection === "requirements" || activeSection === "documents" ? (
                <DossierRequirementsPreview
                  dossierId={dossierId}
                  horses={query.data.bookingSummary.horses}
                  dossier={query.data}
                  plannedDepartureDate={query.data.bookingSummary.requestedDepartureDate}
                  documentsOnly={activeSection === "documents"}
                />
              ) : (
                <Card className="booking-panel gap-0 rounded-[2px] border bg-white py-0">
                  <CardContent className="p-5">
                    <EmptyState message={integrationMessages[activeSection]} />
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
