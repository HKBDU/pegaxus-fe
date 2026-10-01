export interface EuCountry {
  /** ISO 3166-1 alpha-2 code, as used by country-state-city. */
  isoCode: string
  name: string
}

/** The only countries offered in the Country dropdown (the 27 EU member states). */
export const EU_COUNTRIES: readonly EuCountry[] = [
  { isoCode: "AT", name: "Austria" },
  { isoCode: "BE", name: "Belgium" },
  { isoCode: "BG", name: "Bulgaria" },
  { isoCode: "HR", name: "Croatia" },
  { isoCode: "CY", name: "Cyprus" },
  { isoCode: "CZ", name: "Czechia" },
  { isoCode: "DK", name: "Denmark" },
  { isoCode: "EE", name: "Estonia" },
  { isoCode: "FI", name: "Finland" },
  { isoCode: "FR", name: "France" },
  { isoCode: "DE", name: "Germany" },
  { isoCode: "GR", name: "Greece" },
  { isoCode: "HU", name: "Hungary" },
  { isoCode: "IE", name: "Ireland" },
  { isoCode: "IT", name: "Italy" },
  { isoCode: "LV", name: "Latvia" },
  { isoCode: "LT", name: "Lithuania" },
  { isoCode: "LU", name: "Luxembourg" },
  { isoCode: "MT", name: "Malta" },
  { isoCode: "NL", name: "Netherlands" },
  { isoCode: "PL", name: "Poland" },
  { isoCode: "PT", name: "Portugal" },
  { isoCode: "RO", name: "Romania" },
  { isoCode: "SK", name: "Slovakia" },
  { isoCode: "SI", name: "Slovenia" },
  { isoCode: "ES", name: "Spain" },
  { isoCode: "SE", name: "Sweden" },
]


export function findEuCountryByName(name: string | undefined): EuCountry | undefined {
  const normalized = name?.trim().toLowerCase()
  if (!normalized) return undefined
  // The API also accepts "Czech Republic" for Czechia.
  const alias = normalized === "czech republic" ? "czechia" : normalized
  return EU_COUNTRIES.find((country) => country.name.toLowerCase() === alias)
}

export function findEuCountryByCode(code: string | undefined): EuCountry | undefined {
  return EU_COUNTRIES.find((country) => country.isoCode === code)
}
