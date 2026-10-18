import type {
  DossierHorseOption,
  DossierRequirement,
  DocumentReviewError,
} from "../types";
import { mapDocumentReviewError } from "./document-review";

export function groupMissingDossierRequirements(
  items: readonly DossierRequirement[],
  horses: readonly DossierHorseOption[],
) {
  const trip = items.filter((item) => item.horseId === null);
  const groups = trip.length
    ? [{ key: "trip", title: "Common Trip Documents", items: trip }]
    : [];
  const horseIds = new Set(
    items.flatMap((item) => (item.horseId === null ? [] : [item.horseId])),
  );
  const orderedIds = [
    ...horses.map((horse) => horse.horseId).filter((id) => horseIds.has(id)),
    ...[...horseIds].filter(
      (id) => !horses.some((horse) => horse.horseId === id),
    ),
  ];
  for (const id of orderedIds) {
    const members = items.filter((item) => item.horseId === id);
    groups.push({
      key: String(id),
      title:
        horses.find((horse) => horse.horseId === id)?.horseName ??
        members[0]?.horseName ??
        "Horse-specific requirements",
      items: members,
    });
  }
  return groups;
}

export function mapMissingDocumentReminderError(
  error: unknown,
  writeLockReason?: string | null,
): DocumentReviewError {
  const mapped = mapDocumentReviewError(error);
  if (mapped.code === "NO_MISSING_DR")
    return {
      ...mapped,
      refresh: true,
      message:
        "The selected requirements no longer need a missing-document reminder. Refresh and review the latest statuses.",
    };
  if (mapped.code === "DOSSIER_LOCKED")
    return {
      ...mapped,
      refresh: true,
      message:
        writeLockReason === "BOOKING_CHANGE_IN_PROGRESS"
          ? "A booking change is in progress. Document reminders are temporarily locked."
          : "Cannot send reminders unless the dossier is in preparation and unlocked.",
    };
  if (mapped.code === "FORBIDDEN")
    return {
      ...mapped,
      message: "You do not have permission to send document reminders.",
    };
  return {
    ...mapped,
    message:
      mapped.code === "REVIEW_FAILED"
        ? "Could not send the reminder. Please try again."
        : mapped.message,
  };
}
