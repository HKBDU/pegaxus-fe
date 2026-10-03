import type { DossierTemplate } from "@/features/compliance-catalog/template-types"

type MockItem = [complianceRequirementId: number, isMandatory: boolean, appliesPerHorse: boolean, instruction: string | null]

function mock(
  id: number,
  templateCode: string,
  templateName: string,
  status: DossierTemplate["status"],
  versionNo: number,
  effectiveFrom: string | null,
  effectiveTo: string | null,
  updatedAt: string,
  items: MockItem[],
  overrides: Partial<DossierTemplate> = {},
): DossierTemplate {
  return {
    dossierTemplateId: id,
    templateCode,
    templateName,
    description: `Template for ${templateName}.`,
    versionNo,
    status,
    effectiveFrom,
    effectiveTo,
    itemCount: items.length,
    updatedAt,
    isReferenced: false,
    referenceCount: { complianceDossierCount: 0 },
    // requirementName is filled by the service from the CR catalog.
    items: items.map(([complianceRequirementId, isMandatory, appliesPerHorse, instruction], index) => ({
      dossierTemplateItemId: id * 100 + index,
      complianceRequirementId,
      requirementName: "",
      sequenceNo: index + 1,
      isMandatory,
      appliesPerHorse,
      instruction,
    })),
    ...overrides,
  }
}

export const MOCK_DOSSIER_TEMPLATES: DossierTemplate[] = [
  mock(1, "DT-UK-EU-01", "UK-to-EU Cross-Border Racehorse Master Template", "ACTIVE", 2, "2026-01-01", null, "2026-09-20T03:00:00Z", [
    [9, true, true, "Attach a colour scan, valid on the departure date"],
    [10, true, true, "Original passport, microchip must match"],
    [11, true, false, null],
    [3, false, false, null],
  ], { isReferenced: true, referenceCount: { complianceDossierCount: 5 } }),
  mock(2, "DT-EU-IMP-001", "EU Equine Import Core", "ACTIVE", 3, "2026-01-01", null, "2026-09-12T10:15:00Z", [
    [1, true, true, "Provide the Coggins test result"],
    [4, true, true, "Negative result, tested within 30 days of departure"],
    [5, true, false, null],
    [9, true, true, "Attach a colour scan, valid on the departure date"],
    [10, true, true, "Original passport, microchip must match"],
    [11, true, false, "Issued through TRACES-NT"],
    [6, false, true, null],
    [3, false, false, "Only for horses transiting the United States"],
    [8, false, false, "Carnet must cover the whole trip"],
    [2, false, false, null],
  ]),
  mock(3, "DT-UK-EXP-001", "UK Racehorse Export", "ACTIVE", 2, "2026-02-15", "2026-12-31", "2026-08-25T09:00:00Z", [
    [9, true, true, null],
    [8, true, false, "Carnet must cover the whole trip"],
  ]),
  mock(4, "DT-US-IMP-001", "US Equine Import (CDC)", "DRAFT", 1, "2026-05-01", null, "2026-08-10T08:30:00Z", [[3, true, true, null]]),
  mock(5, "DT-GEN-HC-001", "Health Certificate Pack", "INACTIVE", 1, "2025-01-01", "2025-12-31", "2026-01-18T16:00:00Z", [
    [9, true, true, null],
    [4, false, true, null],
  ]),
]
