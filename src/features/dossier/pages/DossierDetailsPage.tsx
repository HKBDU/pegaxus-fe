import { useState } from "react";
import {
  ClipboardList,
  FileText,
  History,
  ShieldCheck,
} from "lucide-react";
import { useParams, useSearchParams } from "react-router-dom";
import { ErrorState, LoadingState } from "@/shared/components/common";
import { PageHeader } from "@/shared/components/PageHeader";
import { BackButton } from "@/shared/components/BackButton";
import { AuthorityInspectionTab } from "@/features/clearance/components/AuthorityInspectionTab";
import { DossierRequirementsPanel } from "@/features/compliance-catalog/pages/DossierRequirementsPage";
import { ROLE_ROUTES } from "@/app/route-config";
import { AuditHistoryPanel } from "./DossierAuditHistoryPage";
import { DossierOverview } from "../components/DossierOverview";
import { DossierReadinessAction } from "../components/DossierReadinessAction";
import { DossierRequirementsPreview } from "../components/DossierRequirementsPreview";
import { useDossierOverview } from "../hooks/useDossier";
import { useDossierRole } from "../hooks/useDossierRole";
import { ReturnTripPanel } from "../components/ReturnTripPanel";
import { getDossierLoadErrorKind } from "../source";
import { useBackTarget } from "@/shared/hooks/useBackTarget";
import { usePageTitle } from "@/shared/hooks";

const sections = [
  { id: "requirements", label: "Dossier Requirements", icon: ClipboardList },
  { id: "documents", label: "Documents / Reviews", icon: FileText },
  { id: "authority", label: "Authority & Inspection", icon: ShieldCheck },
  { id: "audit", label: "Audit History", icon: History },
] as const;
type SectionId = (typeof sections)[number]["id"];

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
  const [searchParams] = useSearchParams();
  // `?tab=audit` lets the old /audit-history link open straight on its tab of this single page.
  const requestedTab = sections.find(
    ({ id }) => id === searchParams.get("tab"),
  )?.id;
  // Bumped by the "Add requirement" shortcut: remounts the requirements tab with its Add dialog open.
  const [addRequest, setAddRequest] = useState(0);
  const [selectedSection, setActiveSection] = useState<SectionId>(
    requestedTab ?? "requirements",
  );
  const role = useDossierRole();
  const visibleSections =
    role === "CUSTOMER"
      ? sections.filter(({ id }) => id !== "audit")
      : sections;
  const activeSection = visibleSections.some(({ id }) => id === selectedSection) ? selectedSection : "requirements";
  const query = useDossierOverview(dossierId);
  const revisionCount = query.data?.requirementSummary?.rejected ?? 0;
  const dossierTitle = revisionCount > 0
    ? "Revision requested"
    : query.data?.dossierCode
      ? `Dossier ${query.data.dossierCode}`
      : "Dossier Details";
  usePageTitle(dossierTitle, revisionCount);

  const fallbackHref =
    role === "TRANSPORT_SPECIALIST"
      ? ROLE_ROUTES.complianceDossiers
      : query.data?.bookingId
        ? `${role === "LOGISTICS_MANAGER" ? "/admin/transport-requests" : "/bookings"}/${encodeURIComponent(String(query.data.bookingId))}`
        : role === "LOGISTICS_MANAGER"
          ? "/admin/transport-requests"
          : "/bookings";

  const fallbackLabel =
    role === "TRANSPORT_SPECIALIST"
      ? "Back to Dossier Tracking"
      : query.data?.bookingId
        ? "Back to Booking"
        : "Back to Bookings";

  const backTarget = useBackTarget({
    fallback: fallbackHref,
    fallbackLabel,
    allowedOrigins: [
      ROLE_ROUTES.complianceDossiers,
      "/admin/compliance-dossiers",
      "/bookings",
      "/admin/transport-requests",
      "/admin/transport-plans",
      "/notifications",
    ],
    labels: {
      [ROLE_ROUTES.complianceDossiers]: "Back to Dossier Tracking",
      "/admin/compliance-dossiers": "Back to Dossier Tracking",
      "/admin/transport-requests": "Back to Booking",
      "/bookings": "Back to Booking",
      "/admin/transport-plans": "Back to Transport Plan",
      "/notifications": "Back to Notifications",
    },
  });

  return (
    <div className="booking-page-shell min-w-0 px-5 py-6 font-sans sm:px-6 lg:px-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1440px] space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <BackButton to={backTarget.href}>
              {backTarget.label}
            </BackButton>
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
            <ReturnTripPanel dossier={query.data} role={role} />
            {query.data.status === "DRAFT" ? (
              <div
                role="status"
                className="rounded-[2px] border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              >
                <p className="m-0 font-semibold">
                  Document upload is not open yet.
                </p>
                <p className="m-0 mt-1">
                  This dossier is waiting for the Transport Specialist to
                  complete route feasibility review. Uploading documents will
                  open after the review is approved.
                </p>
              </div>
            ) : null}
            <DossierReadinessAction
              dossier={query.data}
              onCompleted={() => setActiveSection("authority")}
              onAddRequirement={() => {
                setAddRequest((count) => count + 1);
                setActiveSection("requirements");
              }}
              onRequestReupload={() => setActiveSection("documents")}
            />
            <div className="border-b border-gray-200">
              <div
                role="tablist"
                aria-label="Dossier sections"
                className="flex gap-1 overflow-x-auto"
              >
                {visibleSections.map(({ id, label, icon: Icon }) => (
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
              {activeSection === "requirements" && role !== "CUSTOMER" ? (
                <DossierRequirementsPanel
                  key={addRequest}
                  openAdd={addRequest > 0}
                />
              ) : activeSection === "requirements" ||
                activeSection === "documents" ? (
                <DossierRequirementsPreview
                  dossierId={dossierId}
                  horses={query.data.bookingSummary.horses}
                  dossier={query.data}
                  plannedDepartureDate={
                    query.data.bookingSummary.requestedDepartureDate ??
                    undefined
                  }
                  documentsOnly={activeSection === "documents"}
                />
              ) : activeSection === "authority" ? (
                <AuthorityInspectionTab dossier={query.data} />
              ) : (
                <AuditHistoryPanel />
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
