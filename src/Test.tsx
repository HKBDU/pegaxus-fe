import { useState } from "react";
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
        healthLogs: [
          {
            logId: "vital-001",
            recordedAt: "2026-10-23T08:15:00Z",
            locationName: "Dublin checkpoint",
            temperatureCelsius: 37.8,
            heartRateBpm: 42,
            respirationRate: 16,
            stressLevel: "LOW",
            veterinarianName: "Dr. Sophie Laurent",
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
        healthLogs: [
          {
            logId: "vital-002",
            recordedAt: "2026-10-23T08:20:00Z",
            locationName: "Dublin checkpoint",
            temperatureCelsius: 38.4,
            heartRateBpm: 48,
            respirationRate: 20,
            stressLevel: "NORMAL",
            veterinarianName: "Dr. Sophie Laurent",
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
    "timeline",
    "booking",
    "horses",
    "routing",
    "compliance",
    "operations",
    "finance",
  ];
  return (
    <main className="min-h-screen bg-[#f4f2ed] px-5 py-8 lg:px-10">
      <div className="mx-auto max-w-[1280px] space-y-6">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#f39200]">
          Local mock preview · no backend required
        </p>
        <PageHeader title="AUDIT DOSSIER" backHref="#" />
        <AuditOverviewHeader
          audit={MOCK_AUDIT}
          onExport={() => setExportOpen(true)}
        />
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="flex h-auto flex-wrap gap-1 rounded-[2px] border border-slate-200 bg-white p-1">
            {tabs.map((value) => (
              <TabsTrigger
                key={value}
                value={value}
                className="text-xs font-semibold uppercase"
              >
                {value}
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
            <AuditTimeline items={MOCK_AUDIT.timeline} />
          </TabsContent>
          <TabsContent value="booking">
            <AuditBookingBlock data={MOCK_AUDIT.booking} />
          </TabsContent>
          <TabsContent value="horses">
            <AuditHorsesBlock data={MOCK_AUDIT.horses} />
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
