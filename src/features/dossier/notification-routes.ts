import { dossierDetail } from "@/app/route-config"
import { registerNotificationRoute } from "@/shared/realtime"

// ComplianceDossier notifications: Customer, Transport Specialist and Logistics Manager each have their own detail route.
registerNotificationRoute("ComplianceDossier", (id, principal) => dossierDetail(id, principal?.roles[0]))
