export { dossierService } from "./services";
export {
  useDossierDashboard,
  useDossierOverview,
  useDossierRequirements,
  useAuditHistory,
  useExportDashboard,
} from "./hooks";
export { DossierStatusBadge } from "./components/DossierStatusBadge";
export type * from "./types";
export { default as DossierDetailsPage } from "./pages/DossierDetailsPage";
export { BookingDossierLink } from "./components/BookingDossierLink";
