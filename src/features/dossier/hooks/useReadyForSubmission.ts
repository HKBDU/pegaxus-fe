import { useRef } from "react";
import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { createRequestAttemptGuard } from "@/shared/hooks/request-attempt-guard";
import { mapDocumentReviewError } from "../lib/document-review";
import { loadMarkReadyForSubmission } from "../source";
import { dossierKeys } from "./useDossier";

export async function invalidateDossierReadiness(
  client: QueryClient,
  dossierId: string,
) {
  await Promise.all([
    client.invalidateQueries({
      queryKey: dossierKeys.overview(dossierId),
      exact: true,
    }),
    client.invalidateQueries({
      queryKey: dossierKeys.requirementsRoot(dossierId),
    }),
  ]);
}

export function useReadyForSubmission() {
  const client = useQueryClient();
  const guard = useRef(createRequestAttemptGuard());
  const outcomeUnknown = useRef(false);
  const mutation = useMutation({
    mutationFn: (dossierId: string) => loadMarkReadyForSubmission(dossierId),
    retry: false,
    onSuccess: (_response, dossierId) =>
      invalidateDossierReadiness(client, dossierId),
    onError: (error, dossierId) => {
      const mapped = mapDocumentReviewError(error);
      if (mapped.outcomeUnknown) outcomeUnknown.current = true;
      if (mapped.refresh) return invalidateDossierReadiness(client, dossierId);
    },
  });
  return {
    ...mutation,
    markReady: (dossierId: string) => {
      if (outcomeUnknown.current)
        return Promise.resolve({ started: false } as const);
      guard.current.reset();
      return guard.current.run(() => mutation.mutateAsync(dossierId));
    },
  };
}
