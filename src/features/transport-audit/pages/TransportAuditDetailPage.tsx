import { useState } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store";
import { canAccess } from "@/features/auth/access-control";
import { PageHeader } from "@/shared/components/PageHeader";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/shared/components/common";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { AUDIT_SECTIONS } from "../constants";
import { useTransportAudit } from "../hooks/useTransportAudit";
import { AuditOverviewHeader } from "../components/AuditOverviewHeader";
import { AuditTimeline } from "../components/AuditTimeline";
import { ExportAuditModal } from "../components/ExportAuditModal";
import { AuditDocumentDrawer } from "../components/AuditDocumentDrawer";
import { AuditBookingBlock } from "../components/blocks/AuditBookingBlock";
import { AuditHorsesBlock } from "../components/blocks/AuditHorsesBlock";
import { AuditRoutingBlock } from "../components/blocks/AuditRoutingBlock";
import { AuditComplianceBlock } from "../components/blocks/AuditComplianceBlock";
import { AuditOperationsBlock } from "../components/blocks/AuditOperationsBlock";
import { AuditFinanceBlock } from "../components/blocks/AuditFinanceBlock";
export default function TransportAuditDetailPage() {
  const { transportId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const principal = useAuthStore((state) => state.principal);
  const isManager = canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] });
  const availableSections = isManager
    ? AUDIT_SECTIONS
    : AUDIT_SECTIONS.filter((section) => section.id !== "finance");
  const requestedTab = searchParams.get("tab") ?? "timeline";
  const activeTab =
    requestedTab === "finance" && !isManager ? "timeline" : requestedTab;
  const query = useTransportAudit(
    transportId,
    activeTab === "timeline" ? undefined : activeTab,
  );
  const [exportOpen, setExportOpen] = useState(false);
  const [documentDrawer, setDocumentDrawer] = useState<{
    open: boolean;
    title?: string;
    url?: string;
  }>({ open: false });
  const archiveParams = (
    location.state as { transportArchiveList?: Record<string, unknown> } | null
  )?.transportArchiveList;
  const backHref = archiveParams
    ? `/admin/transport-archive?${new URLSearchParams(
        Object.entries(archiveParams)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)]),
      ).toString()}`
    : "/admin/transport-archive";
  if (query.isPending) return <LoadingState />;
  if (query.isError)
    return (
      <main className="p-8">
        <ErrorState
          message="Unable to load audit dossier."
          onRetry={() => void query.refetch()}
        />
      </main>
    );
  const audit = query.data;
  if (!audit) return <EmptyState message="Transport audit was not found." />;
  const handleTabChange = (tab: string) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set("tab", tab);
        return next;
      },
      { replace: true },
    );
  return (
    <main className="min-h-screen bg-[#f4f2ed] px-5 py-8 lg:px-10">
      <div className="mx-auto max-w-[1280px] space-y-6">
        <PageHeader title="AUDIT DOSSIER" backHref={backHref} />
        <AuditOverviewHeader
          audit={audit}
          onExport={() => setExportOpen(true)}
        />
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-4"
        >
          <TabsList className="flex h-auto flex-wrap gap-1 rounded-[2px] border border-slate-200 bg-white p-1">
            {[
              "timeline",
              ...availableSections.map((section) => section.id),
            ].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="text-xs font-semibold uppercase"
              >
                {tab === "timeline"
                  ? "Timeline"
                  : availableSections.find((section) => section.id === tab)
                      ?.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent
            value="timeline"
            className="rounded-[2px] border bg-white p-6"
          >
            <h2 className="mb-4 text-base font-bold uppercase">
              Unified audit timeline
            </h2>
            <AuditTimeline items={audit.timeline} publicOnly={!isManager} />
          </TabsContent>
          <TabsContent value="booking">
            <AuditBookingBlock data={audit.booking} />
          </TabsContent>
          <TabsContent value="horses">
            <AuditHorsesBlock data={audit.horses} />
          </TabsContent>
          <TabsContent value="routing">
            <AuditRoutingBlock data={audit.routing} isManager={isManager} />
          </TabsContent>
          <TabsContent value="compliance">
            <AuditComplianceBlock
              data={audit.compliance}
              onPreviewDoc={(title, url) =>
                setDocumentDrawer({ open: true, title, url })
              }
            />
          </TabsContent>
          <TabsContent value="operations">
            <AuditOperationsBlock data={audit.operations} />
          </TabsContent>
          {isManager ? (
            <TabsContent value="finance">
              <AuditFinanceBlock data={audit.finance} />
            </TabsContent>
          ) : null}
        </Tabs>
      </div>
      <ExportAuditModal
        transportId={transportId}
        open={exportOpen}
        onOpenChange={setExportOpen}
      />
      <AuditDocumentDrawer
        open={documentDrawer.open}
        onOpenChange={(open) =>
          setDocumentDrawer((current) => ({ ...current, open }))
        }
        title={documentDrawer.title ?? "Audit document"}
        url={documentDrawer.url}
      />
    </main>
  );
}
