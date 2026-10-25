import type { FinancialReport } from "../schemas";
import { financialDemoIds } from "./ids";

const ref = (suffix: string) =>
  `f6600000-0000-4000-8000-${suffix.padStart(12, "0")}`;
const stamp = "2026-10-25T12:00:00Z";

export function getFinancialDemo(transportId: string): FinancialReport | null {
  const scenario = Object.entries(financialDemoIds).find(
    ([, id]) => id === transportId.toLowerCase(),
  );
  if (!scenario) return null;
  const [name, id] = scenario;
  const provisional = name === "provisional";
  const stale = name === "stale";
  const sample = provisional ? 3 : stale ? 2 : 1;
  return {
    serverTime: stamp,
    financialReportId: provisional ? null : ref(String(100 + sample)),
    reportCode: provisional
      ? null
      : `FR-DEMO-2026-${String(sample).padStart(3, "0")}`,
    isProvisional: provisional,
    isStale: stale,
    warnings: provisional ? ["TRANSPORT_NOT_COMPLETED"] : [],
    transport: {
      transportId: id,
      transportCode: `TR-DEMO-${name.toUpperCase()}`,
      status: provisional ? "IN_TRANSIT" : "COMPLETED",
    },
    booking: {
      bookingId: ref(String(200 + sample)),
      bookingCode: `BK-DEMO-${String(sample).padStart(3, "0")}`,
    },
    dossierTemplateId: provisional ? null : ref("301"),
    currency: "VND",
    totalInvoicedAmount: 50_000_000,
    totalPaidAmount: 30_000_000,
    totalEmergencyCost: 2_500_000,
    outstandingAmount: 20_000_000,
    summaryNote: provisional
      ? null
      : "Demo review: reconcile the outstanding balance before closing the transport.",
    generatedAt: provisional ? null : stamp,
    createdAt: provisional ? null : "2026-10-24T12:00:00Z",
    updatedAt: provisional ? null : stamp,
    reconciliation: {
      hasMismatch: stale,
      items: stale
        ? [
            {
              invoiceId: ref(String(400 + sample)),
              invoiceNumber: `INV-DEMO-${String(sample).padStart(3, "0")}`,
              issue: "RECEIPT_AMOUNT_MISMATCH",
              expectedAmount: 50_000_000,
              actualAmount: 30_000_000,
            },
          ]
        : [],
    },
    suggestedItems: [
      {
        itemType: "TRANSPORT_FEE",
        description: "Base vehicle transport",
        quantity: 1,
        suggestedPrice: 18_000_000,
        referenceAmount: null,
        basis: { vehicleTier: "TIER_S", horseCount: 2 },
        sourceRefs: [],
        warning: null,
      },
      {
        itemType: "HORSE_SERVICE_FEE",
        description: "Horse care during transport",
        quantity: 2,
        suggestedPrice: 3_600_000,
        referenceAmount: null,
        basis: { horseCount: 2, transportDays: 3 },
        sourceRefs: [],
        warning: null,
      },
      {
        itemType: "HANDLING_FEE",
        description: "Loading and handling",
        quantity: 2,
        suggestedPrice: 800_000,
        referenceAmount: null,
        basis: {
          horseCount: 2,
          handlingOptions: { assistedLoading: true, additionalStaff: 1 },
        },
        sourceRefs: [],
        warning: null,
      },
      {
        itemType: "COMPLIANCE_FEE",
        description: "Compliance dossier preparation",
        quantity: 1,
        suggestedPrice: 2_000_000,
        referenceAmount: null,
        basis: { dossierTemplateId: provisional ? null : ref("301") },
        sourceRefs: provisional
          ? []
          : [{ type: "ComplianceDossier", id: ref(String(500 + sample)) }],
        warning: null,
      },
      {
        itemType: "EMERGENCY_COST",
        description: "Approved veterinary care and vehicle repair",
        quantity: 1,
        suggestedPrice: null,
        referenceAmount: 2_500_000,
        basis: {
          requestCount: 2,
          incidentCodes: [
            `IR-FIN-DEMO-${sample}-001`,
            `IR-FIN-DEMO-${sample}-002`,
          ],
        },
        sourceRefs: [
          {
            type: "EmergencyCostRequest",
            id: ref(String(600 + sample * 10 + 1)),
          },
          {
            type: "EmergencyCostRequest",
            id: ref(String(600 + sample * 10 + 2)),
          },
        ],
        warning: null,
      },
      {
        itemType: "OTHER",
        description: "Additional services, if requested",
        quantity: 1,
        suggestedPrice: null,
        referenceAmount: null,
        basis: {},
        sourceRefs: [],
        warning: null,
      },
    ],
  };
}
