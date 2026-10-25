import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createRequestAttemptGuard } from "@/shared/hooks/request-attempt-guard";
import { mapMissingDocumentReminderError } from "../lib/missing-document-reminder";
import { dossierIdSchema } from "../schemas";
import {
  loadMissingDossierRequirements,
  loadMissingRequirementReminder,
} from "../source";
import type { SendMissingDocumentReminderInput } from "../types";
import { dossierKeys } from "./useDossier";
import { invalidateDossierAfterUpload } from "./useUploadComplianceDocument";

export function useMissingDossierRequirements(id: string, enabled: boolean) {
  return useQuery({
    queryKey: dossierKeys.missingRequirements(id),
    queryFn: ({ signal }) => loadMissingDossierRequirements(id, signal),
    enabled: enabled && dossierIdSchema.safeParse(id).success,
    retry: false,
  });
}

export function useMissingDocumentReminder() {
  const client = useQueryClient();
  const guard = useRef(createRequestAttemptGuard());
  const outcomeUnknown = useRef(false);
  const mutation = useMutation({
    mutationFn: (input: SendMissingDocumentReminderInput) =>
      loadMissingRequirementReminder(input),
    retry: false,
    onSuccess: (_response, input) =>
      invalidateDossierAfterUpload(client, input.dossierId),
    onError: (error, input) => {
      const mapped = mapMissingDocumentReminderError(error);
      if (mapped.outcomeUnknown) outcomeUnknown.current = true;
      if (mapped.refresh)
        return invalidateDossierAfterUpload(client, input.dossierId);
    },
  });
  return {
    ...mutation,
    sendReminder: (input: SendMissingDocumentReminderInput) => {
      if (outcomeUnknown.current)
        return Promise.resolve({ started: false } as const);
      guard.current.reset();
      return guard.current.run(() => mutation.mutateAsync(input));
    },
  };
}
