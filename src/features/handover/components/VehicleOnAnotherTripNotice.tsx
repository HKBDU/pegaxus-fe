import { TriangleAlert } from "lucide-react"
import { Link } from "react-router-dom"
import { routePlanDetail } from "@/app/route-config"
import type { HandoverAudience } from "../constants"
import type { OverviewSegment } from "../types"

/** The route plan page is for staff only: the crew gets the instruction without a link. */
export function routePlanLinkFor(audience: HandoverAudience, leg?: Pick<OverviewSegment, "routePlanId">) {
  return audience === "admin" && leg?.routePlanId ? routePlanDetail(leg.routePlanId) : undefined
}

/** `VEHICLE_STILL_ON_ANOTHER_TRIP`: the way out is for the Route Coordinator to change the vehicle, then to complete the PICKUP again. */
export function VehicleOnAnotherTripNotice({ routePlanHref }: { routePlanHref?: string }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-[2px] border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="space-y-1">
        <p className="m-0 font-semibold">A vehicle of this transport is still on another trip.</p>
        <p className="m-0">Ask the Route Coordinator to change the vehicle on the route plan, then complete the pickup handover again.</p>
        {routePlanHref ? (
          <Link to={routePlanHref} className="inline-block font-semibold underline underline-offset-2">
            Open the route plan
          </Link>
        ) : null}
      </div>
    </div>
  )
}
