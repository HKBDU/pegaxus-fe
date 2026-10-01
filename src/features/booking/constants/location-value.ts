import { City, State } from "country-state-city"

import { findEuCountryByName } from "./eu-countries"

/**
 * The API only accepts a plain EU country name in `*Country` and has no state/city fields, so state and
 * city travel at the end of the address: "<address>, <City>, <State>".
 */
export interface AddressLocation {
  /** State/region ISO code ("" when not selected). */
  state: string
  /** City name ("" when not selected). */
  city: string
}

export function composeAddress(
  address: string,
  { state, city }: AddressLocation,
  countryName: string,
): string {
  const country = findEuCountryByName(countryName)
  const stateName = country && state ? State.getStateByCodeAndCountry(state, country.isoCode)?.name : undefined
  return [address.trim(), city, stateName].filter(Boolean).join(", ")
}

/** Inverse of `composeAddress`: strips a trailing city/state that matches the country's own data. */
export function splitAddress(
  fullAddress: string,
  countryName: string,
): AddressLocation & { address: string } {
  const parts = fullAddress.split(",").map((part) => part.trim())
  const country = findEuCountryByName(countryName)
  if (!country || parts.length < 2) return { address: fullAddress, state: "", city: "" }

  const code = country.isoCode
  const states = State.getStatesOfCountry(code)
  const matchedState = states.find((item) => item.name === parts[parts.length - 1])
  let state = ""
  let city = ""

  if (matchedState) {
    state = matchedState.isoCode
    parts.pop()
    const cities = City.getCitiesOfState(code, state)
    if (parts.length > 1 && cities.some((item) => item.name === parts[parts.length - 1])) city = parts.pop() ?? ""
  } else if (states.length === 0) {
    // Countries without regions in the dataset: the city sits last.
    const last = parts[parts.length - 1]
    if (City.getCitiesOfCountry(code)?.some((item) => item.name === last)) city = parts.pop() ?? ""
  }

  return { address: parts.join(", "), state, city }
}
