export interface EuCountry {
  /** ISO 3166-1 alpha-2 code, as used by country-state-city. */
  isoCode: string
  name: string
}

/** The countries offered in the Country dropdown (EU member states and United Kingdom). */
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
  { isoCode: "GB", name: "United Kingdom" },
]

export function findEuCountryByName(name: string | undefined): EuCountry | undefined {
  const normalized = name?.trim().toLowerCase()
  if (!normalized) return undefined
  // Handle aliases: Czech Republic -> Czechia, UK / Great Britain -> United Kingdom
  let alias = normalized
  if (alias === "czech republic") alias = "czechia"
  else if (alias === "uk" || alias === "gb" || alias === "great britain") alias = "united kingdom"
  return EU_COUNTRIES.find((country) => country.name.toLowerCase() === alias)
}

export function findEuCountryByCode(code: string | undefined): EuCountry | undefined {
  const upper = code?.trim().toUpperCase()
  if (!upper) return undefined
  if (upper === "UK") return EU_COUNTRIES.find((country) => country.isoCode === "GB")
  return EU_COUNTRIES.find((country) => country.isoCode === upper)
}
