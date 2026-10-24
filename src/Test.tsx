import { useState } from "react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/shared/components/PageHeader";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { AuditOverviewHeader } from "@/features/transport-audit/components/AuditOverviewHeader";
import { AuditTimeline } from "@/features/transport-audit/components/AuditTimeline";
import { AuditDocumentDrawer } from "@/features/transport-audit/components/AuditDocumentDrawer";
import { ExportAuditModal } from "@/features/transport-audit/components/ExportAuditModal";
import { AuditBookingBlock } from "@/features/transport-audit/components/blocks/AuditBookingBlock";
import { AuditHorsesBlock } from "@/features/transport-audit/components/blocks/AuditHorsesBlock";
import { AuditRoutingBlock } from "@/features/transport-audit/components/blocks/AuditRoutingBlock";
import { AuditComplianceBlock } from "@/features/transport-audit/components/blocks/AuditComplianceBlock";
import { AuditOperationsBlock } from "@/features/transport-audit/components/blocks/AuditOperationsBlock";
import { AuditFinanceBlock } from "@/features/transport-audit/components/blocks/AuditFinanceBlock";
import type { TransportAuditFull } from "@/features/transport-audit/types";

const MOCK_AUDIT: TransportAuditFull = {
  transportId: "mock-transport-001",
  transportCode: "TRN-2026-0042",
  status: "COMPLETED",
  completedAt: "2026-10-24T16:20:00Z",
  originCountry: "Ireland",
  destinationCountry: "France",
  viewMode: "FULL",
  booking: {
    bookingId: "booking-001",
    bookingCode: "BK-2026-0188",
    customer: {
      customerId: "customer-001",
      name: "Victoria Equestrian Ltd",
      email: "ops@victoria-equestrian.test",
      phone: "+353 1 555 0188",
    },
    contractNumber: "CTR-2026-091",
    contractSignedAt: "2026-10-18T09:30:00Z",
    originCountry: "Ireland",
    destinationCountry: "France",
    pickupLocation: "Dublin Equestrian Centre",
    deliveryLocation: "Calais Quarantine Yard",
    claims: [
      {
        claimId: "claim-001",
        claimCode: "CLM-2026-07",
        status: "RESOLVED",
        claimType: "Delay",
        claimedAmount: 1200000,
        createdAt: "2026-10-23T10:00:00Z",
      },
    ],
  },
  horses: {
    horses: [
      {
        horseId: "horse-001",
        horseName: "Silver Comet",
        microchipNumber: "985141092348110",
        passportNumber: "IRE-2026-X981",
        breed: "Thoroughbred",
        gender: "MARE",
        weightKg: 520,
        declaredValue: 240000000,
        healthLogs: [
          {
            logId: "vital-001-a",
            recordedAt: "2026-10-22T06:15:00Z",
            locationName: "Dublin Stables (Pickup)",
            temperatureCelsius: 37.6,
            heartRateBpm: 40,
            respirationRate: 14,
            stressLevel: "LOW",
            veterinarianName: "Dr. Sophie Laurent",
            notes:
              "Pre-departure stable inspection passed. Hydration normal, ready for transit.",
          },
          {
            logId: "vital-001-b",
            recordedAt: "2026-10-22T10:30:00Z",
            locationName: "Rosslare Ferry Port (Rest Stop 1)",
            temperatureCelsius: 37.9,
            heartRateBpm: 44,
            respirationRate: 16,
            stressLevel: "NORMAL",
            veterinarianName: "Dr. Liam Gallagher",
            notes: "Pre-boarding rest stop. Consumed 15L water and hay calmly.",
          },
          {
            logId: "vital-001-c",
            recordedAt: "2026-10-22T18:00:00Z",
            locationName: "Cherbourg Terminal (Disembarkation)",
            temperatureCelsius: 38.0,
            heartRateBpm: 46,
            respirationRate: 16,
            stressLevel: "NORMAL",
            veterinarianName: "Dr. Jean-Luc Mercier",
            notes:
              "Disembarkation physical check. Alert demeanor, zero skin abrasions.",
          },
          {
            logId: "vital-001-d",
            recordedAt: "2026-10-23T01:30:00Z",
            locationName: "Calais Quarantine Yard (Final Handover)",
            temperatureCelsius: 37.7,
            heartRateBpm: 42,
            respirationRate: 15,
            stressLevel: "LOW",
            veterinarianName: "Dr. Jean-Luc Mercier",
            notes:
              "Final delivery handover. Vitals completely stable throughout transit.",
          },
        ],
      },
      {
        horseId: "horse-002",
        horseName: "Northern Star",
        microchipNumber: "985141092348114",
        passportNumber: "GB-2025-V442",
        breed: "Warmblood",
        gender: "GELDING",
        weightKg: 610,
        declaredValue: 185000000,
        healthLogs: [
          {
            logId: "vital-002-a",
            recordedAt: "2026-10-22T06:15:00Z",
            locationName: "Dublin Stables (Pickup)",
            temperatureCelsius: 37.9,
            heartRateBpm: 44,
            respirationRate: 16,
            stressLevel: "NORMAL",
            veterinarianName: "Dr. Sophie Laurent",
            notes: "Baseline vitals within normal parameters.",
          },
          {
            logId: "vital-002-b",
            recordedAt: "2026-10-22T10:30:00Z",
            locationName: "Rosslare Ferry Port (Rest Stop 1)",
            temperatureCelsius: 38.6,
            heartRateBpm: 54,
            respirationRate: 22,
            stressLevel: "HIGH",
            veterinarianName: "Dr. Liam Gallagher",
            notes:
              "Elevated temperature post-highway leg. Administered electrolyte mash and stall fan cooling.",
          },
          {
            logId: "vital-002-c",
            recordedAt: "2026-10-22T18:00:00Z",
            locationName: "Cherbourg Terminal (Disembarkation)",
            temperatureCelsius: 38.1,
            heartRateBpm: 46,
            respirationRate: 17,
            stressLevel: "NORMAL",
            veterinarianName: "Dr. Jean-Luc Mercier",
            notes:
              "Temperature normalized during ferry rest. Horse eating normally.",
          },
          {
            logId: "vital-002-d",
            recordedAt: "2026-10-23T01:30:00Z",
            locationName: "Calais Quarantine Yard (Final Handover)",
            temperatureCelsius: 37.8,
            heartRateBpm: 42,
            respirationRate: 15,
            stressLevel: "LOW",
            veterinarianName: "Dr. Jean-Luc Mercier",
            notes:
              "All vitals in prime health. Delivery cleared by Border Control Post.",
          },
        ],
      },
      {
        horseId: "horse-003",
        horseName: "Royal Sovereign",
        microchipNumber: "985141092348128",
        passportNumber: "FRA-2024-K009",
        breed: "Arabian",
        gender: "STALLION",
        weightKg: 490,
        declaredValue: 310000000,
        healthLogs: [
          {
            logId: "vital-003-a",
            recordedAt: "2026-10-22T06:15:00Z",
            locationName: "Dublin Stables (Pickup)",
            temperatureCelsius: 37.7,
            heartRateBpm: 40,
            respirationRate: 14,
            stressLevel: "LOW",
            veterinarianName: "Dr. Sophie Laurent",
            notes: "Calm disposition, clean veterinary passport stamps.",
          },
          {
            logId: "vital-003-b",
            recordedAt: "2026-10-22T10:30:00Z",
            locationName: "Rosslare Ferry Port (Rest Stop 1)",
            temperatureCelsius: 37.9,
            heartRateBpm: 42,
            respirationRate: 15,
            stressLevel: "LOW",
            veterinarianName: "Dr. Liam Gallagher",
            notes:
              "Excellent hydration, resting peacefully in partitioned stall.",
          },
          {
            logId: "vital-003-c",
            recordedAt: "2026-10-22T18:00:00Z",
            locationName: "Cherbourg Terminal (Disembarkation)",
            temperatureCelsius: 37.8,
            heartRateBpm: 42,
            respirationRate: 14,
            stressLevel: "LOW",
            veterinarianName: "Dr. Jean-Luc Mercier",
            notes: "No signs of travel fatigue. Physical examination cleared.",
          },
          {
            logId: "vital-003-d",
            recordedAt: "2026-10-23T01:30:00Z",
            locationName: "Calais Quarantine Yard (Final Handover)",
            temperatureCelsius: 37.6,
            heartRateBpm: 39,
            respirationRate: 14,
            stressLevel: "LOW",
            veterinarianName: "Dr. Jean-Luc Mercier",
            notes: "Handover signed by receiving veterinary officer.",
          },
        ],
      },
    ],
  },
  routing: {
    routePlanCode: "RP-DUB-CAL-026",
    totalDistanceKm: 742,
    totalDurationHours: 18.5,
    legs: [
      {
        legId: "leg-001",
        legOrder: 1,
        legType: "ROAD_DOMESTIC",
        fromLocation: "Dublin",
        toLocation: "Rosslare",
        plannedDepartureAt: "2026-10-22T06:00:00Z",
        actualDepartureAt: "2026-10-22T06:15:00Z",
        truckPlate: "241-D-8842",
        trailerPlate: "TR-HORSE-09",
        driverName: "Liam O'Connor",
        isOutsourced: false,
      },
      {
        legId: "leg-002",
        legOrder: 2,
        legType: "FERRY",
        fromLocation: "Rosslare",
        toLocation: "Cherbourg",
        plannedDepartureAt: "2026-10-22T10:00:00Z",
        actualDepartureAt: "2026-10-22T10:05:00Z",
        plannedArrivalAt: "2026-10-22T18:00:00Z",
        actualArrivalAt: "2026-10-22T18:20:00Z",
        isOutsourced: true,
        subcontractorName: "Atlantic Equine Haulage",
        outsourcingCost: 18500000,
      },
    ],
  },
  compliance: {
    dossiers: [
      {
        dossierId: "dossier-001",
        dossierCode: "DOS-MAIN-2026-188",
        type: "MAIN",
        status: "APPROVED",
        documents: [
          {
            documentId: "doc-001",
            documentType: "EHC",
            title: "Export Health Certificate",
            version: 3,
            verifiedAt: "2026-10-21T12:00:00Z",
            status: "APPROVED",
            fileUrl: "https://example.com/mock-ehc.pdf",
          },
          {
            documentId: "doc-002",
            documentType: "CITES",
            title: "CITES Permit",
            version: 1,
            verifiedAt: "2026-10-21T12:10:00Z",
            status: "APPROVED",
          },
        ],
      },
    ],
    customsClearance: {
      mrnNumber: "26IE9X7F4A001882",
      clearedAt: "2026-10-24T14:45:00Z",
      borderControlPostName: "Calais BCP",
      inspectionType: "DOCUMENTARY",
      status: "CLEARED",
      proofUrl: "https://example.com/mock-bcp.pdf",
    },
  },
  operations: {
    handovers: [
      {
        handoverRecordId: "handover-001",
        handoverCode: "POD-ROSS-001",
        handoverType: "PICKUP",
        status: "COMPLETED",
        completedAt: "2026-10-22T06:20:00Z",
        handedOverBy: "Dublin Yard",
        receivedBy: "Liam O'Connor",
        digitalSignatureVerified: true,
      },
      {
        handoverRecordId: "handover-002",
        handoverCode: "POD-CAL-001",
        handoverType: "DELIVERY",
        status: "COMPLETED",
        completedAt: "2026-10-24T16:20:00Z",
        handedOverBy: "Liam O'Connor",
        receivedBy: "Calais BCP",
        digitalSignatureVerified: true,
      },
    ],
    incidents: [
      {
        incidentReportId: "incident-001",
        incidentCode: "INC-2026-044",
        category: "WEATHER_DELAY",
        severity: "LOW",
        status: "RESOLVED",
        occurredAt: "2026-10-23T21:15:00Z",
        location: "Cherbourg",
        summary: "Ferry arrival delayed by 35 minutes due to weather.",
        resolutionNotes: "Route coordinator notified customer and updated ETA.",
      },
    ],
  },
  finance: {
    summary: {
      baseFareAmount: 48500000,
      ferryChunnelFee: 12800000,
      bcpQuarantineFee: 6200000,
      insuranceFee: 8900000,
      emergencyCost: 0,
      totalPaidAmount: 76400000,
      currency: "VND",
    },
    invoices: [
      {
        invoiceId: "invoice-001",
        invoiceNumber: "INV-2026-188",
        type: "TRANSPORT",
        status: "PAID",
        totalAmount: 76400000,
        currency: "VND",
        issuedAt: "2026-10-24T17:00:00Z",
        paidAt: "2026-10-24T17:05:00Z",
      },
    ],
    emergencyExpenses: [],
  },
  timeline: [
    {
      id: "event-001",
      type: "STATUS",
      title: "Transport completed",
      description: "Delivery handover verified at Calais BCP.",
      occurredAt: "2026-10-24T16:20:00Z",
      visibility: "PUBLIC",
    },
    {
      id: "event-002",
      type: "HANDOVER",
      title: "Delivery e-POD signed",
      description: "Digital signature verified.",
      occurredAt: "2026-10-24T16:18:00Z",
      visibility: "PUBLIC",
    },
    {
      id: "event-003",
      type: "INCIDENT",
      title: "Weather delay resolved",
      description: "Updated ETA sent to customer.",
      occurredAt: "2026-10-23T21:45:00Z",
      visibility: "INTERNAL",
    },
  ],
  epod: {
    handoverRecordId: "handover-002",
    downloadUrl: "https://example.com/mock-epod.pdf",
  },
};

export default function Test() {
  const [tab, setTab] = useState("timeline");
  const [exportOpen, setExportOpen] = useState(false);
  const [documentOpen, setDocumentOpen] = useState(false);
  const [document, setDocument] = useState<{ title?: string; url?: string }>(
    {},
  );
  const tabs = [
    { id: "timeline", label: "Timeline", count: MOCK_AUDIT.timeline.length },
    {
      id: "horses",
      label: "Horses & Health",
      count: MOCK_AUDIT.horses?.horses.length,
    },
    { id: "booking", label: "Booking" },
    { id: "routing", label: "Routing & Waypoints" },
    {
      id: "compliance",
      label: "Compliance & Customs",
      count: MOCK_AUDIT.compliance?.dossiers.length,
    },
    {
      id: "operations",
      label: "Operations & Handovers",
      count: MOCK_AUDIT.operations?.handovers.length,
    },
    { id: "finance", label: "Financial Settlement" },
  ];

  return (
    <main className="min-h-screen bg-[#f4f2ed] px-3 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px] space-y-3.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#f39200]">
            Local Mock Preview · 3 Racehorses with Checkpoint Trajectory
          </p>
          <span className="text-[11px] text-slate-500 font-medium">
            Issue #149 UI Enhancements
          </span>
        </div>

        <PageHeader title="AUDIT DOSSIER" backHref="#" />

        <AuditOverviewHeader
          audit={MOCK_AUDIT}
          onExport={() => setExportOpen(true)}
          onPreviewEpod={() => {
            setDocument({
              title: `e-POD — ${MOCK_AUDIT.transportCode}`,
              url: MOCK_AUDIT.epod?.downloadUrl,
            });
            setDocumentOpen(true);
          }}
        />

        <Tabs value={tab} onValueChange={setTab} className="space-y-3">
          <div className="sticky top-[22px] z-20 -mx-1 px-1 py-0.5 bg-[#f4f2ed]/95 backdrop-blur-md">
            <TabsList className="flex h-auto w-full flex-wrap gap-1 rounded-[2px] border border-[#d9d3c7] bg-white p-1 shadow-xs">
              {tabs.map((tabItem) => {
                const isActive = tab === tabItem.id;
                return (
                  <TabsTrigger
                    key={tabItem.id}
                    value={tabItem.id}
                    className={cn(
                      "flex items-center gap-1.5 rounded-[2px] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors",
                      isActive
                        ? "!bg-[#222834] !text-[#f8fafc] shadow-xs"
                        : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900",
                    )}
                  >
                    <span
                      className={isActive ? "text-[#f8fafc]" : "text-slate-700"}
                    >
                      {tabItem.label}
                    </span>
                    {tabItem.count !== undefined ? (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                          isActive
                            ? "bg-white/15 text-[#f8fafc]"
                            : "bg-slate-100 text-slate-600",
                        )}
                      >
                        {tabItem.count}
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
                {MOCK_AUDIT.timeline.length} events
              </span>
            </div>
            <AuditTimeline items={MOCK_AUDIT.timeline} />
          </TabsContent>
          <TabsContent value="horses">
            <AuditHorsesBlock data={MOCK_AUDIT.horses} />
          </TabsContent>
          <TabsContent value="booking">
            <AuditBookingBlock data={MOCK_AUDIT.booking} />
          </TabsContent>
          <TabsContent value="routing">
            <AuditRoutingBlock data={MOCK_AUDIT.routing} isManager />
          </TabsContent>
          <TabsContent value="compliance">
            <AuditComplianceBlock
              data={MOCK_AUDIT.compliance}
              onPreviewDoc={(title, url) => {
                setDocument({ title, url });
                setDocumentOpen(true);
              }}
            />
          </TabsContent>
          <TabsContent value="operations">
            <AuditOperationsBlock data={MOCK_AUDIT.operations} />
          </TabsContent>
          <TabsContent value="finance">
            <AuditFinanceBlock data={MOCK_AUDIT.finance} />
          </TabsContent>
        </Tabs>
      </div>
      <ExportAuditModal
        transportId={String(MOCK_AUDIT.transportId)}
        open={exportOpen}
        onOpenChange={setExportOpen}
      />
      <AuditDocumentDrawer
        open={documentOpen}
        onOpenChange={setDocumentOpen}
        title={document.title ?? "Mock document"}
        url={document.url}
      />
    </main>
  );
}
