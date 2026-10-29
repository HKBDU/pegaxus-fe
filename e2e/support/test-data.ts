/**
 * Test data builders. Everything here is synthetic: there is no real account, token, horse or booking in this suite.
 * Shapes follow the types the application itself parses (the `types.ts` file of each feature under src/features).
 */

export interface TestSession {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: {
    accountId: string
    accountType: "CUSTOMER" | "EMPLOYEE"
    role: string
    customerId: string | null
    employeeId: string | null
    fullName: string
    avatarUrl: string | null
  }
}

export const TEST_PASSWORD = "E2e-Password-1"

/** Credentials typed into the login form by the specs. Fake: the mocked API accepts them, no real backend does. */
export const CUSTOMER_CREDENTIALS = { email: "customer@e2e.test", password: TEST_PASSWORD }

export function buildSession(role: string, overrides: Partial<TestSession["user"]> = {}): TestSession {
  const isCustomer = role === "CUSTOMER"
  return {
    accessToken: `e2e-access-token-${role.toLowerCase()}`,
    refreshToken: `e2e-refresh-token-${role.toLowerCase()}`,
    expiresIn: 3600,
    user: {
      accountId: `00000000-0000-4000-8000-${isCustomer ? "000000000001" : "000000000002"}`,
      accountType: isCustomer ? "CUSTOMER" : "EMPLOYEE",
      role,
      customerId: isCustomer ? "00000000-0000-4000-8000-0000000000c1" : null,
      employeeId: isCustomer ? null : "00000000-0000-4000-8000-0000000000e1",
      fullName: isCustomer ? "Test Customer" : "Test Employee",
      avatarUrl: null,
      ...overrides,
    },
  }
}

export interface TestHorse {
  horseId: string
  horseName: string
  sex: "MALE" | "FEMALE" | "GELDING"
  breed: string
  dateOfBirth: string
  color: string
  countryOfOrigin: string
  weightKg: number
  heightCm: number
  passportNumber: string
  microchipNumber: string
  identificationNotes: string
  avatarUrl: string | null
}

export function buildHorse(overrides: Partial<TestHorse> = {}): TestHorse {
  return {
    horseId: "11111111-1111-4111-8111-111111111111",
    horseName: "Golden Thunder",
    sex: "MALE",
    breed: "Thoroughbred",
    dateOfBirth: "2018-04-12",
    color: "Bay",
    countryOfOrigin: "Ireland",
    weightKg: 520.5,
    heightCm: 165.2,
    passportNumber: "IE123456789ABCD",
    microchipNumber: "981020000123456",
    identificationNotes: "White star on forehead; calm during transport.",
    avatarUrl: null,
    ...overrides,
  }
}

/** The two horses the customer already owns when the booking form opens. */
export const OWNED_HORSES: TestHorse[] = [
  buildHorse(),
  buildHorse({
    horseId: "22222222-2222-4222-8222-222222222222",
    horseName: "Silver Mist",
    sex: "FEMALE",
    breed: "Arabian",
    passportNumber: "FR987654321WXYZ",
    microchipNumber: "250269800765432",
  }),
]

export function pagedValue<T>(items: T[], pageIndex = 1, pageSize = 10) {
  return {
    items,
    pageIndex,
    pageSize,
    totalItems: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
  }
}

/** A place as the Geoapify geocoding API describes it (only the properties the application reads). */
export interface TestPlace {
  name: string
  formatted: string
  city: string
  country: string
  country_code: string
  lat: number
  lon: number
}

export const PLACES = {
  londonStable: {
    name: "London Riding Stables",
    formatted: "London Riding Stables, Hyde Park, London W2 2UH, United Kingdom",
    city: "London",
    country: "United Kingdom",
    country_code: "gb",
    lat: 51.5073,
    lon: -0.1657,
  },
  manchesterYard: {
    name: "Manchester Equestrian Centre",
    formatted: "Manchester Equestrian Centre, Oxford Road, Manchester M13 9PL, United Kingdom",
    city: "Manchester",
    country: "United Kingdom",
    country_code: "gb",
    lat: 53.4668,
    lon: -2.2339,
  },
  parisStable: {
    name: "Haras de Paris",
    formatted: "Haras de Paris, Bois de Boulogne, 75016 Paris, France",
    city: "Paris",
    country: "France",
    country_code: "fr",
    lat: 48.8566,
    lon: 2.3522,
  },
  newYork: {
    name: "Central Park Stables",
    formatted: "Central Park Stables, New York, NY 10019, United States",
    city: "New York",
    country: "United States",
    country_code: "us",
    lat: 40.7829,
    lon: -73.9654,
  },
} satisfies Record<string, TestPlace>

export interface TestBooking {
  bookingId: string
  bookingCode: string
  status: "PENDING" | "APPROVED" | "CANCELLED" | "REJECTED" | "DRAFT"
  statusName: string
  customer: { customerId: string; fullName: string; phone: string }
  originAddress: string
  originCountry: string
  originLatitude: number
  originLongitude: number
  destinationAddress: string
  destinationCountry: string
  destinationLatitude: number
  destinationLongitude: number
  requestedDepartureDate: string
  requestedArrivalDate: string | null
  totalHorses: number
  horses: {
    horseId: string
    horseName: string
    sex: TestHorse["sex"]
    breed: string
    microchipNumber: string
    passportNumber: string
    specialHandlingNotes: string | null
  }[]
  specialRequirements: string | null
  customerNote: string | null
  assignedEmployee: null
  submittedAt: string
  approvedAt: null
  rejectedAt: null
  cancelledAt: null
  rejectionReason: null
  cancellationReason: null
  transport: null
  createdAt: string
  updatedAt: string
}

/** A booking as `GET /bookings/{id}` returns it right after it was created: waiting for the Logistics Manager. */
export function buildBooking(overrides: Partial<TestBooking> = {}): TestBooking {
  return {
    bookingId: "44444444-4444-4444-8444-444444444444",
    bookingCode: "BK-20261029-0001",
    status: "PENDING",
    statusName: "Pending Approval",
    customer: { customerId: "00000000-0000-4000-8000-0000000000c1", fullName: "Test Customer", phone: "0900000000" },
    originAddress: PLACES.londonStable.formatted,
    originCountry: "United Kingdom",
    originLatitude: PLACES.londonStable.lat,
    originLongitude: PLACES.londonStable.lon,
    destinationAddress: PLACES.manchesterYard.formatted,
    destinationCountry: "United Kingdom",
    destinationLatitude: PLACES.manchesterYard.lat,
    destinationLongitude: PLACES.manchesterYard.lon,
    requestedDepartureDate: "2026-12-15",
    requestedArrivalDate: "2026-12-18",
    totalHorses: 0,
    horses: [],
    specialRequirements: null,
    customerNote: null,
    assignedEmployee: null,
    submittedAt: "2026-10-29T10:00:00Z",
    approvedAt: null,
    rejectedAt: null,
    cancelledAt: null,
    rejectionReason: null,
    cancellationReason: null,
    transport: null,
    createdAt: "2026-10-29T10:00:00Z",
    updatedAt: "2026-10-29T10:00:00Z",
    ...overrides,
  }
}
