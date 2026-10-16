import type { ComplianceRequirement } from "@/features/compliance-catalog/types"

const noReferences = { dossierTemplateItemCount: 0, dossierRequirementCount: 0, linkedDossierCount: 0 }

function mock(
  id: number,
  requirementCode: string,
  requirementName: string,
  category: ComplianceRequirement["category"],
  country: string | null,
  bcpCode: string | null,
  validityPeriodDays: number | null,
  updatedAt: string,
  overrides: Partial<ComplianceRequirement> = {},
): ComplianceRequirement {
  return {
    complianceRequirementId: id,
    requirementCode,
    requirementName,
    description: null,
    country,
    category,
    issuingAuthority: null,
    bcpCode,
    legalBasis: null,
    validityRequired: validityPeriodDays !== null,
    validityPeriodDays,
    status: "ACTIVE",
    createdAt: "2026-06-01T08:00:00Z",
    updatedAt,
    isReferenced: false,
    referenceCount: noReferences,
    ...overrides,
  }
}

const referenced = { dossierTemplateItemCount: 4, dossierRequirementCount: 128, linkedDossierCount: 100 }

export const MOCK_COMPLIANCE_REQUIREMENTS: ComplianceRequirement[] = [
  mock(1, "CR-EQ-VET-01", "Equine Infectious Anemia (Coggins) Certificate", "QUARANTINE", "IE", "Dublin Port (IE DUB)", 30, "2026-09-18T14:22:00Z", {
    issuingAuthority: "Department of Agriculture",
    legalBasis: "Regulation (EU) 2016/429 (AHL)",
    isReferenced: true,
    referenceCount: referenced,
  }),
  mock(2, "CR-CUST-GB-04", "Single Administrative Document (SAD)", "CUSTOMS", "GB", "Dover Ferry Terminal (GB DOV)", null, "2026-09-15T09:10:00Z", { isReferenced: true, referenceCount: { dossierTemplateItemCount: 2, dossierRequirementCount: 40, linkedDossierCount: 31 } }),
  mock(3, "CR-BIO-US-889", "USDA APHIS Veterinary Transit Clearance", "TRANSPORT", "US", "JFK Airport (US JFK)", 90, "2026-09-10T08:30:00Z"),
  mock(4, "CR-EQ-VET-09", "Equine Viral Arteritis Negative Test", "QUARANTINE", "FR", "Calais Port (FR CQF)", 180, "2026-09-02T11:45:00Z"),
  mock(5, "CR-TR-EU-12", "Export Health Certificate (EHC 8461)", "CUSTOMS", "EU", null, null, "2026-08-28T16:10:00Z"),
  mock(6, "CR-MED-FR-03", "FEI Recognition Card / Passport Endorsement", "HORSE_IDENTITY", "FR", "Paris Charles de Gaulle (FR CDG)", 365, "2026-08-20T10:05:00Z"),
  mock(7, "CR-BIO-DE-102", "Equine Influenza Booster Protocol (DE-2023)", "HORSE_HEALTH", "DE", "Frankfurt CargoCity (DE FRA)", null, "2026-07-12T13:00:00Z", { status: "INACTIVE" }),
  mock(8, "CR-CUST-GB-08", "Customs Carnet ATA Documentation", "CUSTOMS", "GB", "London Stansted Airport (GB STN)", 365, "2026-07-01T17:40:00Z"),
  mock(9, "CR-EHC-01", "Export Health Certificate (EHC)", "HORSE_HEALTH", "GB", "Dover Ferry Terminal (GB DOV)", 10, "2026-06-25T10:00:00Z", { isReferenced: true, referenceCount: referenced }),
  mock(10, "CR-PASSPORT-01", "Horse Passport", "HORSE_IDENTITY", null, null, null, "2026-06-20T09:00:00Z"),
  mock(11, "CR-CHEDA-01", "Common Health Entry Document (CHED-A)", "QUARANTINE", "EU", "Calais Port (FR CQF)", 10, "2026-06-12T09:30:00Z"),
  mock(12, "CR-TEST-99", "Test Requirement (unused)", "OTHER", "NL", null, null, "2026-06-05T09:30:00Z"),
]
