import { ROLE_ROUTES } from "@/app/route-config"
import { registerNotificationRoute } from "@/shared/realtime"

registerNotificationRoute("Vehicle", (id) => `${ROLE_ROUTES.vehicles}/${encodeURIComponent(id)}`)
// There is no provider detail page: the list is the closest place.
registerNotificationRoute("TransportProvider", () => ROLE_ROUTES.transportProviders)
