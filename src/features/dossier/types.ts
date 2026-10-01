import type { z } from "zod";
import type {
  dossierOverviewSchema,
  dossierRequirementSchema,
  dossierRequirementStatusSchema,
  dossierRequirementsParamsSchema,
  dossierRequirementsPageSchema,
  bookingSummarySchema,
  dossierHorseOptionSchema,
  requirementSummarySchema,
} from "./schemas";

export type DossierOverview = z.infer<typeof dossierOverviewSchema>;
export type DossierRequirement = z.infer<typeof dossierRequirementSchema>;
export type DossierRequirementStatus = z.infer<typeof dossierRequirementStatusSchema>;
export type DossierRequirementsParams = z.input<typeof dossierRequirementsParamsSchema>;
export type DossierRequirementsPage = z.infer<typeof dossierRequirementsPageSchema>;
export type BookingSummary = z.infer<typeof bookingSummarySchema>;
export type DossierHorseOption = z.infer<typeof dossierHorseOptionSchema>;
export type RequirementSummary = z.infer<typeof requirementSummarySchema>;

export type DossierSourceKind = "api" | "mock";
export type DossierMockScenario = "normal" | "locked" | "empty" | "error";
export type DossierLoadErrorKind = "forbidden" | "not-found" | "contract" | "unauthorized" | "load";
