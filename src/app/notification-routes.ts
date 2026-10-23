// Every feature registers where ITS notifications lead (see shared/realtime/notification-routes.ts).
// A new feature adds one line here; importing the file is enough, each module registers itself.
import "@/features/booking/notification-routes"
import "@/features/dossier/notification-routes"
import "@/features/fleet/notification-routes"
import "@/features/incident-management/notification-routes"
import "@/features/incident-response/notification-routes"
import "@/features/invoice/notification-routes"
import "@/features/route-view/notification-routes"
import "@/features/transport-plan/notification-routes"
