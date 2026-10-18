import { useEffect, useMemo, useRef, useState } from "react"

import { POINT_SIDE_LABEL, roundCoordinate, toPickedPoint, type BookingPointSide, type PickedPoint } from "@/features/booking/lib/place"
import { MapViewer, type MapLocation } from "@/shared/components/map"
import { reverseGeocodeGeoapify, searchGeoapifyPlaces, type GeoapifyPlace } from "@/shared/utils/map"

interface BookingPointMapProps {
  origin: PickedPoint | null
  destination: PickedPoint | null
  /** The point a click or a search result sets. */
  side: BookingPointSide
  onPick: (side: BookingPointSide, point: PickedPoint) => void
  /** Progress and problems ("Looking up the address...", "Only EU/UK is supported") shown next to the map. */
  onMessage: (message: string | null) => void
  /** Called after the pickup point is set while no destination exists yet, so the next pick goes to the destination. */
  onPickupDone?: () => void
}

function toMapLocation(id: string, side: BookingPointSide, point: PickedPoint): MapLocation {
  return {
    id,
    name: POINT_SIDE_LABEL[side],
    address: point.address,
    country: point.country,
    latitude: point.latitude,
    longitude: point.longitude,
  }
}

function placeToOption(place: GeoapifyPlace, index: number): MapLocation {
  return {
    id: `search-${index}`,
    name: place.name || place.address || "Unnamed place",
    address: place.address,
    city: place.city,
    country: place.country,
    latitude: place.latitude,
    longitude: place.longitude,
  }
}

/** Customers cannot read /locations, so the map only shows the two points they pick (Geoapify search + click). */
export default function BookingPointMap({ origin, destination, side, onPick, onMessage, onPickupDone }: BookingPointMapProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<GeoapifyPlace[]>([])
  // The query the current `results` answer; while it differs from `query` a search is in flight.
  const [answeredQuery, setAnsweredQuery] = useState("")
  const requestId = useRef(0)

  useEffect(() => {
    const text = query.trim()
    if (!text) return
    const controller = new AbortController()
    searchGeoapifyPlaces(text, controller.signal)
      .then((places) => {
        setResults(places)
        setAnsweredQuery(query)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        setResults([])
        setAnsweredQuery(query)
        onMessage("Unable to search places right now. You can still click the map.")
      })
    return () => controller.abort()
  }, [onMessage, query])

  const originLocation = useMemo(() => (origin ? toMapLocation("booking-origin", "origin", origin) : null), [origin])
  const destinationLocation = useMemo(
    () => (destination ? toMapLocation("booking-destination", "destination", destination) : null),
    [destination],
  )
  const locations = useMemo(
    () => [originLocation, destinationLocation].filter((item): item is MapLocation => item !== null),
    [destinationLocation, originLocation],
  )
  const searching = query.trim() !== "" && answeredQuery !== query
  // Results of an older query stay in state until the next search; they are hidden once the box is empty.
  const options = useMemo(() => (query.trim() ? results.map(placeToOption) : []), [query, results])

  const commit = (target: BookingPointSide, place: GeoapifyPlace | null, point?: { latitude: number; longitude: number }) => {
    const converted = toPickedPoint(place)
    if ("error" in converted) {
      onMessage(converted.error)
      return
    }
    onMessage(null)
    // A click keeps the exact spot the Customer chose; the address only describes the nearest place.
    const picked = point
      ? { ...converted.point, latitude: roundCoordinate(point.latitude), longitude: roundCoordinate(point.longitude) }
      : converted.point
    onPick(target, picked)
    if (target === "origin" && !destination) onPickupDone?.()
  }

  const handleMapClick = async (point: { latitude: number; longitude: number }) => {
    const current = ++requestId.current
    const target = side
    onMessage("Looking up the address...")
    try {
      const place = await reverseGeocodeGeoapify(point)
      if (current !== requestId.current) return
      commit(target, place, point)
    } catch {
      if (current === requestId.current) onMessage("Unable to look up this address. Try again.")
    }
  }

  const handleSearchSelect = (location: MapLocation) => {
    const index = Number(String(location.id).replace("search-", ""))
    const place = results[index]
    if (!place) return
    commit(side, place)
  }

  return (
    // MapViewer sizes itself to 87vh; inside the booking form it fills this box instead.
    <div className="h-[380px] sm:h-[460px] lg:h-[560px] [&>div]:h-full! [&>div]:min-h-0!">
      <MapViewer
        locations={locations}
        mode="pickPoint"
        showSearch
        searchOptions={options}
        searchLoading={searching}
        searchEmptyMessage="No places found."
        onSearchChange={setQuery}
        onLocationSelect={handleSearchSelect}
        onMapClick={(point) => void handleMapClick(point)}
        buildStartLocation={originLocation}
        buildEndLocation={destinationLocation}
      />
    </div>
  )
}
