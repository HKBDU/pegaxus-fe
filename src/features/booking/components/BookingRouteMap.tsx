import { useMemo } from "react"

import type { Booking } from "@/features/booking/types"
import { MapViewer, type MapLocation } from "@/shared/components/map"

type BookingRouteMapProps = Pick<
  Booking,
  | "originAddress"
  | "originCountry"
  | "originLatitude"
  | "originLongitude"
  | "destinationAddress"
  | "destinationCountry"
  | "destinationLatitude"
  | "destinationLongitude"
>

/** Read-only map of the two points picked for the booking. No click handler is passed, so nothing can change. */
export default function BookingRouteMap(props: BookingRouteMapProps) {
  const { origin, destination } = useMemo(() => {
    const point = (
      id: string,
      name: string,
      address: string,
      country: string,
      latitude: number | null,
      longitude: number | null,
    ): MapLocation | null =>
      typeof latitude === "number" && typeof longitude === "number"
        ? { id, name, address, country, latitude, longitude }
        : null
    return {
      origin: point("booking-origin", "Pickup", props.originAddress, props.originCountry, props.originLatitude, props.originLongitude),
      destination: point("booking-destination", "Destination", props.destinationAddress, props.destinationCountry, props.destinationLatitude, props.destinationLongitude),
    }
  }, [props])
  const locations = useMemo(() => [origin, destination].filter((item): item is MapLocation => item !== null), [destination, origin])

  if (!locations.length) return null

  return (
    // MapViewer sizes itself to 87vh; on the details page it fills this smaller box instead.
    <div className="h-[320px] sm:h-[380px] [&>div]:h-full! [&>div]:min-h-0!">
      <MapViewer
        locations={locations}
        mode="pickPoint"
        buildStartLocation={origin}
        buildEndLocation={destination}
      />
    </div>
  )
}
