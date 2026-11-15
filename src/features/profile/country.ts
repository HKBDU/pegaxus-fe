import { getCountryDataList } from "countries-list"

/**
 * An employee's country is stored as an ISO 3166-1 alpha-2 code (assignment filters match on it), while the shared
 * CountrySelect works with country names. These helpers convert at the employee profile boundary only; customers keep names.
 */
const countries = getCountryDataList()

export function countryNameFromCode(value: string | null | undefined) {
  const text = value?.trim() ?? ""
  if (text.length !== 2) return text
  return countries.find((country) => country.iso2 === text.toUpperCase())?.name ?? text
}

export function countryCodeFromName(value: string | null | undefined) {
  const text = value?.trim() ?? ""
  if (!text) return undefined
  if (text.length === 2) return text.toUpperCase()
  return countries.find((country) => country.name.toLowerCase() === text.toLowerCase())?.iso2
}
