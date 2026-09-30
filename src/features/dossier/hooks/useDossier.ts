import { useQuery } from "@tanstack/react-query";
import { dossierIdSchema } from "../schemas";
import type { DossierRequirementsParams } from "../types";
import {
  dossierSourceKind,
  getDossierLoadErrorKind,
  loadDossierOverview,
  loadDossierRequirements,
} from "../source";

export const dossierKeys = {
  overview: (id: string) => ["dossier", dossierSourceKind, id] as const,
  requirements: (id: string, params: DossierRequirementsParams) =>
    ["dossier", dossierSourceKind, id, "requirements", params] as const,
};

const retryLoad = (failures: number, error: unknown) =>
  failures < 1 && getDossierLoadErrorKind(error) === "load";

export function useDossierOverview(id: string) {
  const invalidId = !dossierIdSchema.safeParse(id).success;
  const query = useQuery({
    queryKey: dossierKeys.overview(id),
    queryFn: ({ signal }) => loadDossierOverview(id, signal),
    enabled: !invalidId,
    retry: retryLoad,
  });
  return { ...query, invalidId };
}

export function useDossierRequirements(
  id: string,
  params: DossierRequirementsParams,
  enabled = true,
) {
  return useQuery({
    queryKey: dossierKeys.requirements(id, params),
    queryFn: ({ signal }) => loadDossierRequirements(id, params, signal),
    enabled: enabled && dossierIdSchema.safeParse(id).success,
    retry: retryLoad,
  });
}
