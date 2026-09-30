import { z } from "zod";
import {
  dossierOverviewSchema,
  createUploadDocumentSchema,
  dossierRequirementsPageSchema,
  dossierRequirementsParamsSchema,
  validateUploadFiles,
} from "./schemas";
import type { DossierLoadErrorKind, DossierMockScenario, DossierRequirementsParams, DossierSourceKind, UploadDocumentInput } from "./types";

export function resolveDossierSource(isDev: boolean, flag: string | undefined): DossierSourceKind {
  return isDev && flag === "true" ? "mock" : "api";
}

export const dossierSourceKind = resolveDossierSource(
  import.meta.env.DEV,
  import.meta.env.VITE_DOSSIER_API_MOCKS,
);

function mockScenario(): DossierMockScenario {
  const scenario = import.meta.env.VITE_DOSSIER_MOCK_SCENARIO ?? "normal";
  if (["normal", "locked", "empty", "error"].includes(scenario)) {
    return scenario as DossierMockScenario;
  }
  throw new Error(`Unsupported dossier mock scenario: ${scenario}`);
}

export async function loadDossierOverview(dossierId: string, signal?: AbortSignal) {
  signal?.throwIfAborted();
  if (dossierSourceKind === "mock") {
    const { getMockDossier } = await import("./mocks/dossier.mock");
    return dossierOverviewSchema.parse(getMockDossier(dossierId, mockScenario()));
  }
  const { dossierService } = await import("./services");
  return dossierService.getOverview(dossierId, signal);
}

export async function loadDossierRequirements(
  dossierId: string,
  params: DossierRequirementsParams,
  signal?: AbortSignal,
) {
  const query = dossierRequirementsParamsSchema.parse(params);
  signal?.throwIfAborted();
  if (dossierSourceKind === "mock") {
    const { getMockRequirements } = await import("./mocks/dossier.mock");
    return dossierRequirementsPageSchema.parse(getMockRequirements(dossierId, query, mockScenario()));
  }
  const { dossierService } = await import("./services");
  return dossierService.getRequirements(dossierId, query, signal);
}

export async function loadUploadDocument(input: UploadDocumentInput) {
  if (dossierSourceKind === "mock") {
    const fileError = validateUploadFiles(input.files);
    if (fileError) throw new Error(fileError.code);
    createUploadDocumentSchema(null).parse(input.metadata);
    const { uploadMockDocument } = await import("./mocks/dossier.mock");
    return uploadMockDocument(input.dossierId, input.requirementId, input.files, mockScenario());
  }
  const { dossierService } = await import("./services");
  return dossierService.uploadComplianceDocument(input);
}

export function getDossierLoadErrorKind(error: unknown): DossierLoadErrorKind {
  if (error instanceof z.ZodError) return "contract";
  const response = (error as { response?: { status?: number; data?: { errorCode?: string } }; status?: number }) ?? {};
  const status = response.response?.status ?? response.status;
  const code = response.response?.data?.errorCode;
  if (status === 401) return "unauthorized";
  if (status === 403 || code === "FORBIDDEN") return "forbidden";
  if (status === 404 || code === "DOSSIER_NOT_FOUND" || code === "NOT_FOUND") return "not-found";
  return "load";
}
