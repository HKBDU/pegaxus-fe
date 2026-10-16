import { useId, useMemo, useState } from "react"
import { City, State, type ICity, type IState } from "country-state-city"

import { cn } from "@/lib/utils"
import { EU_COUNTRIES } from "../constants/eu-countries"
import { Label } from "@/shared/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"

/**
 * `country` is an ISO2 code (e.g. "FR"), `state` is the state/region ISO code
 * (e.g. "IDF"), `city` is the city name. An empty string means "not selected".
 */
export interface BookingLocation {
  country: string
  state: string
  city: string
}

export interface BookingLocationSelectorProps {
  /** Pre-fills the dropdowns (Edit Booking). Invalid codes are ignored. */
  initialData?: Partial<BookingLocation>
  /** Called with the full location every time any dropdown changes. */
  onLocationChange: (location: BookingLocation) => void
  disabled?: boolean
  className?: string
  /** Prefix for element ids; lets you render several selectors on one page. */
  idPrefix?: string
  /** Prepended to the field labels, e.g. "Pickup" gives "Pickup country". */
  labelPrefix?: string
  /** Validation message shown under the Country field. */
  countryError?: string
  /** Overrides the label styling so the selector can match the surrounding form. */
  labelClassName?: string
}

const EMPTY_LOCATION: BookingLocation = { country: "", state: "", city: "" }

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name)

const statesCache = new Map<string, IState[]>()

/**
 * States/regions of a country. The city dataset is sparse (e.g. only 13 of France's 123 divisions have
 * cities), so we only offer divisions that have at least one city, to avoid dead-end selections.
 * If none of them has cities we keep them all.
 */
function getStates(countryCode: string): IState[] {
  if (!countryCode) return []
  const cached = statesCache.get(countryCode)
  if (cached) return cached

  const all = State.getStatesOfCountry(countryCode).sort(byName)
  const withCities = all.filter((item) => City.getCitiesOfState(countryCode, item.isoCode).length > 0)
  const result = withCities.length > 0 ? withCities : all
  statesCache.set(countryCode, result)
  return result
}

function getCities(countryCode: string, stateCode: string): ICity[] {
  if (!countryCode) return []
  // A few countries have no states in the dataset; fall back to their full city list.
  const cities = stateCode
    ? City.getCitiesOfState(countryCode, stateCode)
    : State.getStatesOfCountry(countryCode).length === 0
      ? City.getCitiesOfCountry(countryCode) ?? []
      : []
  return [...cities].sort(byName)
}

/** Drops any part of `data` that is not valid for the option lists, keeping the cascade consistent. */
function normalizeLocation(data?: Partial<BookingLocation>): BookingLocation {
  const country = EU_COUNTRIES.some((item) => item.isoCode === data?.country) ? data?.country ?? "" : ""
  if (!country) return EMPTY_LOCATION

  const states = getStates(country)
  const state = states.some((item) => item.isoCode === data?.state) ? data?.state ?? "" : ""
  if (states.length > 0 && !state) return { country, state: "", city: "" }

  const city = getCities(country, state).some((item) => item.name === data?.city) ? data?.city ?? "" : ""
  return { country, state, city }
}

export function BookingLocationSelector({
  initialData,
  onLocationChange,
  disabled = false,
  className,
  idPrefix,
  labelPrefix,
  countryError,
  labelClassName,
}: BookingLocationSelectorProps) {
  const generatedId = useId()
  const id = idPrefix ?? generatedId
  const [location, setLocation] = useState<BookingLocation>(() => normalizeLocation(initialData))

  // Re-sync when the parent supplies different initial data later (e.g. the booking finishes loading).
  const initialKey = `${initialData?.country ?? ""}|${initialData?.state ?? ""}|${initialData?.city ?? ""}`
  const [appliedInitialKey, setAppliedInitialKey] = useState(initialKey)
  if (initialKey !== appliedInitialKey) {
    setAppliedInitialKey(initialKey)
    setLocation(normalizeLocation(initialData))
  }

  const states = useMemo(() => getStates(location.country), [location.country])
  const cities = useMemo(() => getCities(location.country, location.state), [location.country, location.state])

  const update = (next: BookingLocation) => {
    setLocation(next)
    onLocationChange(next)
  }

  const stateDisabled = disabled || !location.country || states.length === 0
  const cityDisabled = disabled || !location.country || (states.length > 0 && !location.state) || cities.length === 0

  return (
    <div className={cn("grid gap-3 sm:grid-cols-3", className)}>
      <LocationField id={`${id}-country`} label={fieldLabel(labelPrefix, "country", "Country")} error={countryError} labelClassName={labelClassName}>
        <Select
          value={location.country || undefined}
          disabled={disabled}
          onValueChange={(country) => update({ country, state: "", city: "" })}
        >
          <SelectTrigger id={`${id}-country`} aria-invalid={countryError ? true : undefined} className={triggerClass}>
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent className={contentClass}>
            {EU_COUNTRIES.map((item) => (
              <SelectItem key={item.isoCode} value={item.isoCode} className={itemClass}>{item.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </LocationField>

      <LocationField id={`${id}-state`} label={fieldLabel(labelPrefix, "state / region", "State / Region")} labelClassName={labelClassName}>
        <Select
          // Remount when the option list changes so a stale label never lingers after a reset.
          key={`state-${location.country}`}
          value={location.state || undefined}
          disabled={stateDisabled}
          onValueChange={(state) => update({ ...location, state, city: "" })}
        >
          <SelectTrigger id={`${id}-state`} className={triggerClass}>
            <SelectValue placeholder={location.country && states.length === 0 ? "No regions available" : "Select state / region"} />
          </SelectTrigger>
          <SelectContent className={contentClass}>
            {states.map((item) => (
              <SelectItem key={item.isoCode} value={item.isoCode} className={itemClass}>{item.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </LocationField>

      <LocationField id={`${id}-city`} label={fieldLabel(labelPrefix, "city", "City")} labelClassName={labelClassName}>
        <Select
          key={`city-${location.country}-${location.state}`}
          value={location.city || undefined}
          disabled={cityDisabled}
          onValueChange={(city) => update({ ...location, city })}
        >
          <SelectTrigger id={`${id}-city`} className={triggerClass}>
            <SelectValue placeholder={location.country && (location.state || states.length === 0) && cities.length === 0 ? "No cities available" : "Select city"} />
          </SelectTrigger>
          <SelectContent className={contentClass}>
            {cities.map((item) => (
              // City names can repeat inside a state, so the key also carries coordinates.
              <SelectItem key={`${item.name}-${item.latitude}-${item.longitude}`} value={item.name} className={itemClass}>{item.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </LocationField>
    </div>
  )
}

const triggerClass = "h-8 w-full rounded-[2px] border-[#f3aa3b] bg-transparent px-3 py-1 text-xs shadow-none"
const contentClass = "max-h-64 rounded-[2px] border-slate-200 bg-white font-sans shadow-md"
const itemClass = "text-xs"

const fieldLabel = (prefix: string | undefined, lower: string, fallback: string) =>
  prefix ? `${prefix} ${lower}` : fallback

function LocationField({
  id,
  label,
  error,
  labelClassName,
  children,
}: {
  id: string
  label: string
  error?: string
  labelClassName?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Label htmlFor={id} className={cn("text-xs font-normal text-gray-600", labelClassName)}>{label}</Label>
      {children}
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
