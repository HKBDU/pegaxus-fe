import { crewTurnErrorMessage } from "@/shared/constants/crew-turn";
import { ZodError } from "zod";
import type { IncidentApiError } from "./services";
import type { PhotoUploadState } from "@/shared/components/PhotoCaptureSection";

export type IncidentFieldErrors = Record<string, string>;

export function areIncidentPhotosReady(value: {
  files: File[];
  uploadedPublicIds: string[];
  uploadState?: PhotoUploadState;
}) {
  return (
    value.files.length === 0 ||
    (value.uploadState === "ready" &&
      value.uploadedPublicIds.length === value.files.length &&
      value.uploadedPublicIds.every((id) => id.length > 0) &&
      new Set(value.uploadedPublicIds).size === value.files.length)
  );
}

function fieldPath(path: string, horseIds: string[]) {
  const parts = path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean)
    .map((part) => part.charAt(0).toLowerCase() + part.slice(1));
  if (parts[0] === "photoFiles") return "photoFiles";
  if (parts[0] === "horses" && /^\d+$/.test(parts[1] ?? "")) {
    const horseId = horseIds[Number(parts[1])];
    if (horseId) parts[1] = horseId;
  }
  return parts.join(".");
}

export function getIncidentFieldErrors(
  error: unknown,
  horseIds: string[] = [],
): IncidentFieldErrors {
  const fields: IncidentFieldErrors = {};
  if (error instanceof ZodError) {
    for (const issue of error.issues) {
      const key = fieldPath(issue.path.map(String).join("."), horseIds);
      let message = issue.message;
      if (issue.code === "too_small") {
        message =
          issue.origin === "string"
            ? `Enter at least ${issue.minimum} characters.`
            : `Enter a value of at least ${issue.minimum}.`;
      } else if (issue.code === "too_big") {
        message =
          issue.origin === "string"
            ? `Use no more than ${issue.maximum} characters.`
            : `Use a value no greater than ${issue.maximum}.`;
      } else if (issue.code === "invalid_type") {
        message = "Enter a valid value.";
      } else if (issue.code === "invalid_format") {
        message = "Enter a valid date and time.";
      } else if (issue.code === "invalid_value") {
        message = "Select a valid option.";
      }
      fields[key] ??= message;
    }
  } else if (
    error &&
    typeof error === "object" &&
    "errors" in error &&
    Array.isArray(error.errors)
  ) {
    for (const item of error.errors) {
      if (
        item &&
        typeof item.field === "string" &&
        typeof item.message === "string"
      ) {
        fields[fieldPath(item.field, horseIds)] ??= item.message;
      }
    }
  }
  return fields;
}

export function incidentErrorMessage(
  error: unknown,
  fields: IncidentFieldErrors,
) {
  if (!error) return null;
  if (fields.$ || fields[""]) return fields.$ ?? fields[""];
  if (Object.keys(fields).length > 0 || error instanceof ZodError) {
    return "Please check the highlighted fields before submitting.";
  }
  const apiError = error as Partial<IncidentApiError>;
  if (apiError.status === 401)
    return "Your session has expired. Sign in again; your draft remains on this page.";
  const crewTurn = crewTurnErrorMessage(apiError);
  if (crewTurn) return crewTurn;
  if (apiError.status === 403)
    return "You do not have permission to report this incident for this transport.";
  if (apiError.status === undefined && apiError.errorCode === "NETWORK_ERROR") {
    return "Unable to reach the server. Your draft and photos have been kept. Please try again.";
  }
  return error instanceof Error
    ? error.message
    : "Unable to submit the incident. Your draft has been kept.";
}

export function focusFirstIncidentError() {
  requestAnimationFrame(() => {
    const message = document.querySelector("[data-incident-error]");
    const field = message?.closest("label, [data-incident-field]");
    const control = field?.querySelector<HTMLElement>(
      "input, textarea, select, button",
    );
    (control ?? message)?.scrollIntoView({
      block: "center",
      behavior: "instant",
    });
    control?.focus({ preventScroll: true });
  });
}
