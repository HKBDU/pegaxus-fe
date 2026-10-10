import type { Provider } from "@/features/fleet/types"

const id = (n: number) => `00000000-0000-4000-9000-${String(n).padStart(12, "0")}`

const row = (
  n: number,
  providerCode: string,
  providerName: string,
  supportedModes: Provider["supportedModes"],
  status: Provider["status"],
  country: string,
  email: string,
  phone: string,
  contactName: string,
): Provider => ({
  transportProviderId: id(n),
  providerCode,
  providerName,
  status,
  supportedModes,
  taxCode: `TAX-${100000 + n * 7919}`,
  contactName,
  phone,
  email,
  address: null,
  country,
  note: null,
  createdAt: "2026-09-01T03:00:00Z",
  updatedAt: `2026-09-${String(30 - n).padStart(2, "0")}T03:00:00Z`,
})

export const MOCK_PROVIDERS: Provider[] = [
  row(1, "PRV-EUR-001", "EquiTrans Europe", ["AIR"], "ACTIVE", "Western Europe", "ops@equitranseu.com", "+49 69 1234 5678", "Anna Weber"),
  row(2, "PRV-EUR-002", "Cheval Route SAS", ["ROAD"], "ACTIVE", "France", "contact@chevalroute.fr", "+33 1 45 67 89 10", "Luc Moreau"),
  row(3, "PRV-EUR-003", "HorseFly Logistics", ["AIR"], "ACTIVE", "European Union", "operations@horsefly.aero", "+31 20 345 6789", "Eva de Vries"),
  row(4, "PRV-EUR-004", "OceanHoof Shipping", ["SEA"], "SUSPENDED", "United Kingdom", "info@oceanhoof.com", "+44 2380 987654", "James Hart"),
  row(5, "PRV-EUR-005", "Alpine Horse Transport", ["ROAD"], "ACTIVE", "Germany", "dispatch@alpine-horse.de", "+49 89 7654 3210", "Karl Brandt"),
  row(6, "PRV-EUR-006", "Nordic Equine Movers", ["ROAD"], "ACTIVE", "Sweden", "info@nordicequine.se", "+46 8 123 4567", "Elin Larsson"),
  row(7, "PRV-EUR-007", "Iberia Horse Express", ["ROAD"], "INACTIVE", "Spain", "ops@iberiahorse.es", "+34 91 234 5678", "Carlos Ruiz"),
  row(8, "PRV-EUR-008", "Baltic Animal Logistics", ["SEA"], "ACTIVE", "Latvia", "contact@balticanimal.lv", "+371 67 890 123", "Janis Ozols"),
  row(9, "PRV-EUR-009", "EuroHorse Cargo", ["AIR"], "SUSPENDED", "Belgium", "cargo@eurohorsecargo.eu", "+32 2 345 6789", "Marie Dubois"),
  row(10, "PRV-EUR-010", "GreenFields Transport", ["ROAD"], "ACTIVE", "Belgium", "hello@greenfields.be", "+32 3 456 7890", "Tom Peeters"),
  row(11, "PRV-EUR-011", "Lufthansa Cargo", ["AIR", "ROAD"], "ACTIVE", "Germany", "ops@lhcargo.example", "+49 69 000 1111", "Operations Desk"),
  row(12, "PRV-EUR-012", "Dover Ferry Horse Lines", ["SEA", "ROAD"], "ACTIVE", "United Kingdom", "horses@doverferry.example", "+44 1304 000 222", "Port Office"),
]

/** Providers the mock treats as assigned to unfinished segments, so PV6 returns 409 PROVIDER_IN_USE. */
export const MOCK_PROVIDER_IN_USE_IDS = new Set([id(11)])
