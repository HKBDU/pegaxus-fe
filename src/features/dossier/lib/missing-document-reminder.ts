import { isMissingDossierRequirement } from "../constants";
import type { DossierHorseOption, DossierRequirement, DossierRequirementsPage, DossierRequirementsParams, DocumentReviewError } from "../types";
import { mapDocumentReviewError } from "./document-review";

export async function collectMissingDossierRequirements(
  loadPage: (params: DossierRequirementsParams, signal?: AbortSignal) => Promise<DossierRequirementsPage>,
  signal?: AbortSignal,
) {
  const requirements = new Map<number, DossierRequirement>();
  // Separate D8 filters; neither inherits the table's current horse, page or status.
  for (const status of ["PENDING", "REQUESTED"] as const) {
    let pageIndex = 1;
    let totalPages = 1;
    do {
      signal?.throwIfAborted();
      const page = await loadPage({ status, pageIndex, pageSize: 100, sortBy: "createdAt:asc" }, signal);
      signal?.throwIfAborted();
      if (page.pageIndex !== pageIndex) throw new Error("Unexpected D8 page index. Please refresh requirements.");
      for (const item of page.items) {
        if (isMissingDossierRequirement(item)) requirements.set(item.dossierRequirementId, item);
      }
      totalPages = page.totalPages;
      pageIndex++;
    } while (pageIndex <= totalPages);
  }
  return [...requirements.values()];
}

export function groupMissingDossierRequirements(items: readonly DossierRequirement[], horses: readonly DossierHorseOption[]) {
  const trip = items.filter((item) => item.horseId === null);
  const groups = trip.length ? [{ key: "trip", title: "Common Trip Documents", items: trip }] : [];
  const horseIds = new Set(items.flatMap((item) => item.horseId === null ? [] : [item.horseId]));
  const orderedIds = [...horses.map((horse) => horse.horseId).filter((id) => horseIds.has(id)),
    ...[...horseIds].filter((id) => !horses.some((horse) => horse.horseId === id))];
  for (const id of orderedIds) {
    const members = items.filter((item) => item.horseId === id);
    groups.push({ key: String(id), title: horses.find((horse) => horse.horseId === id)?.horseName ?? members[0]?.horseName ?? "Horse-specific requirements", items: members });
  }
  return groups;
}

export function mapMissingDocumentReminderError(error: unknown, writeLockReason?: string | null): DocumentReviewError {
  const mapped = mapDocumentReviewError(error);
  if (mapped.code === "NO_MISSING_DR") return {
    ...mapped, refresh: true,
    message: "The selected requirements no longer need a missing-document reminder. Refresh and review the latest statuses.",
  };
  if (mapped.code === "DOSSIER_LOCKED") return {
    ...mapped, refresh: true,
    message: writeLockReason === "BOOKING_CHANGE_IN_PROGRESS"
      ? "A booking change is in progress. Document reminders are temporarily locked."
      : "Cannot send reminders unless the dossier is in preparation and unlocked.",
  };
  if (mapped.code === "FORBIDDEN") return { ...mapped, message: "You do not have permission to send document reminders." };
  return { ...mapped, message: mapped.code === "REVIEW_FAILED" ? "Could not send the reminder. Please try again." : mapped.message };
}
