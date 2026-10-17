import { POINT_SIDE_LABEL, type BookingPointSide, type PickedPoint } from "@/features/booking/lib/place"
import { cn } from "@/lib/utils"

interface BookingPointCardsProps {
  origin: PickedPoint | null
  destination: PickedPoint | null
  side: BookingPointSide
  onSideChange: (side: BookingPointSide) => void
  message: string | null
  errors?: Partial<Record<BookingPointSide, string>>
}

/** The two points of the route, next to the map: pick which one the next click sets and read what was chosen. */
export function BookingPointCards({ origin, destination, side, onSideChange, message, errors }: BookingPointCardsProps) {
  return (
    <div className="grid gap-2">
      <div className="grid gap-2" role="group" aria-label="Choose which point to set">
        {(["origin", "destination"] as const).map((item) => {
          const point = item === "origin" ? origin : destination
          const active = side === item
          return (
            <button
              key={item}
              type="button"
              aria-pressed={active}
              onClick={() => onSideChange(item)}
              className={cn(
                "min-w-0 border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                active ? "border-primary bg-amber-50" : "border-[#e5e2d9] bg-white hover:bg-amber-50/60",
                errors?.[item] && !point && "border-red-500",
              )}
            >
              <span className="flex items-center gap-1.5 font-heading text-[10px] font-medium uppercase leading-4 tracking-[0.1em] text-gray-500">
                <span aria-hidden="true" className={cn("size-2 rounded-full", item === "origin" ? "bg-green-600" : "bg-red-600")} />
                {POINT_SIDE_LABEL[item]}
              </span>
              <span className="mt-0.5 block text-xs font-semibold leading-4 text-gray-900">
                {point ? point.address : "Not picked yet"}
              </span>
              {point ? (
                <span className="block text-[11px] text-gray-500">
                  {point.country} · {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <p className="text-xs text-gray-600" role="status">
        {message ?? `Setting the ${POINT_SIDE_LABEL[side].toLowerCase()} point: click the map or search an address.`}
      </p>
      {errors?.origin ? <p className="text-xs text-destructive">{errors.origin}</p> : null}
      {errors?.destination ? <p className="text-xs text-destructive">{errors.destination}</p> : null}
    </div>
  )
}
