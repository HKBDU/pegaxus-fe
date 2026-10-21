import type { ApplyBooking, CustomRequirementDraft, FinalRequirementRow } from "@/features/compliance-catalog/dossier-types"
import type { DossierTemplateItem } from "@/features/compliance-catalog/template-types"
import type { ComplianceCategory } from "@/features/compliance-catalog/types"

export const templateItemKey = (item: Pick<DossierTemplateItem, "dossierTemplateItemId" | "sequenceNo">) =>
  String(item.dossierTemplateItemId ?? `seq-${item.sequenceNo}`)

/**
 * The lines the BE will generate (R11): an item that "applies per horse" is repeated for every horse of the booking,
 * any other item (and every trip-level custom line) yields exactly one line.
 */
export function buildFinalRows(
  items: DossierTemplateItem[],
  selectedItemIds: Set<string>,
  customs: CustomRequirementDraft[],
  horses: ApplyBooking["horses"],
  categoryOf: (complianceRequirementId: DossierTemplateItem["complianceRequirementId"]) => ComplianceCategory | null,
  isMandatoryRoute?: boolean,
): FinalRequirementRow[] {
  const rows: FinalRequirementRow[] = []

  for (const item of [...items].sort((left, right) => left.sequenceNo - right.sequenceNo)) {
    const key = templateItemKey(item)
    if (!selectedItemIds.has(key)) continue
    const category = categoryOf(item.complianceRequirementId)
    // For intra-EU routes (isMandatoryRoute === false), Quarantine and Customs requirements are optional.
    const isMandatory =
      isMandatoryRoute === false && (category === "QUARANTINE" || category === "CUSTOMS")
        ? false
        : item.isMandatory
    const base = {
      requirementName: item.requirementName,
      category,
      isMandatory,
      instruction: item.instruction,
      isCustom: false,
    }
    if (item.appliesPerHorse) {
      for (const horse of horses) rows.push({ ...base, key: `${key}-${horse.horseId}`, scope: "HORSE", horseName: horse.horseName })
    } else {
      rows.push({ ...base, key, scope: "TRIP", horseName: null })
    }
  }

  for (const custom of customs) {
    rows.push({
      key: `custom-${custom.key}`,
      requirementName: custom.requirementName,
      category: custom.category,
      scope: custom.horseId === null ? "TRIP" : "HORSE",
      horseName: custom.horseName,
      isMandatory: custom.isMandatory,
      instruction: custom.instruction ?? null,
      isCustom: true,
    })
  }

  return rows
}

export function countRows(rows: FinalRequirementRow[]) {
  const horse = rows.filter((row) => row.scope === "HORSE").length
  return { total: rows.length, horse, trip: rows.length - horse }
}
