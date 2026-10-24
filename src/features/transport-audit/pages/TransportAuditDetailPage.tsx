import { useState } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
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
    <main className="min-h-screen bg-[#f4f2ed] px-3 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px] space-y-3.5">
        <PageHeader title="AUDIT DOSSIER" backHref={backHref} />
        <AuditOverviewHeader
          audit={audit}
          onExport={() => setExportOpen(true)}
          onPreviewEpod={() =>
            audit.epod?.downloadUrl
              ? setDocumentDrawer({
                open: true,
                title: `e-POD — ${audit.transportCode}`,
                url: audit.epod.downloadUrl,
              })
              : undefined
          }
        />
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-3"
        >
          <div className="sticky top-[10px] z-20 -mx-1 px-1 py-0.5 bg-[#f4f2ed]/95 backdrop-blur-md">
            <TabsList className="flex h-auto w-full flex-wrap gap-1 rounded-[2px] border border-[#343b49] bg-[#171b24] p-1.5 shadow-[0_8px_20px_rgba(23,25,28,0.18)]">
              {[
                {
                  id: "timeline",
                  label: "Timeline",
                  count: audit.timeline.length,
                },
                {
                  id: "horses",
                  label: "Horses & Health",
                  count: audit.horses?.horses.length,
                },
                { id: "booking", label: "Booking" },
                { id: "routing", label: "Routing & Waypoints" },
                {
                  id: "compliance",
                  label: "Compliance & Customs",
                  count: audit.compliance?.dossiers.length,
                },
                {
                  id: "operations",
                  label: "Operations & Handovers",
                  count: audit.operations?.handovers.length,
                },
                ...(isManager
                  ? [{ id: "finance", label: "Financial Settlement" }]
                  : []),
              ]
                .filter(
                  (tab) =>
                    tab.id === "timeline" ||
                    availableSections.some((s) => s.id === tab.id),
                )
                .map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className={cn(
                        "flex items-center gap-1.5 rounded-[2px] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors",
                        isActive
                          ? "!bg-[#f39200] !text-[#17191c] shadow-sm"
                          : "text-slate-200 hover:bg-[#f39200] hover:text-[#17191c]",
                      )}
                    >
                      <span
                        className={
                          isActive ? "text-[#17191c]" : "text-slate-100"
                        }
                      >
                        {tab.label}
                      </span>
                      {tab.count !== undefined ? (
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                            isActive
                              ? "bg-black/10 text-[#17191c]"
                              : "bg-white/15 text-slate-100",
                          )}
                        >
                          {tab.count}
                        </span>
                      ) : null}
                    </TabsTrigger>
                  );
                })}
            </TabsList>
          </div>

          <TabsContent
            value="timeline"
            className="rounded-[2px] border border-[#e6e2d9] bg-white p-4 sm:p-5 shadow-xs"
          >
            <div className="mb-4 flex items-center justify-between border-b border-[#e6e2d9] pb-3">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Unified Chronological Audit Trail
                </h2>
                <p className="text-[11px] text-slate-500">
                  Verified immutable event log across handovers, status changes,
                  and checkpoints.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {audit.timeline.length}{" "}
                {audit.timeline.length === 1 ? "event" : "events"}
              </span>
            </div>
            <AuditTimeline items={audit.timeline} publicOnly={!isManager} />
          </TabsContent>
          <TabsContent value="horses">
            <AuditHorsesBlock data={audit.horses} />
          </TabsContent>
          <TabsContent value="booking">
            <AuditBookingBlock data={audit.booking} />
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
