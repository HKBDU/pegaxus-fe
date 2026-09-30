import apiClient from "@/lib/axios";
import {
  dossierIdSchema,
  dossierOverviewEnvelopeSchema,
  dossierRequirementsEnvelopeSchema,
  dossierRequirementsParamsSchema,
} from "./schemas";
import type { DossierRequirementsParams } from "./types";

export const dossierService = {
  async getOverview(dossierId: string, signal?: AbortSignal) {
    const id = dossierIdSchema.parse(dossierId);
    const payload = await apiClient.get<unknown, unknown>(
      `compliance-dossiers/${encodeURIComponent(id)}`,
      { signal },
    );
    return dossierOverviewEnvelopeSchema.parse(payload).value;
  },

  async getRequirements(
    dossierId: string,
    params: DossierRequirementsParams,
    signal?: AbortSignal,
  ) {
    const id = dossierIdSchema.parse(dossierId);
    const query = dossierRequirementsParamsSchema.parse(params);
    const payload = await apiClient.get<unknown, unknown>(
      `compliance-dossiers/${encodeURIComponent(id)}/requirements`,
      { params: query, signal },
    );
    return dossierRequirementsEnvelopeSchema.parse(payload).value;
  },
};
