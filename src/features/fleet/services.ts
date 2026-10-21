import apiClient from "@/lib/axios"
import type { PaginatedResponse } from "@/shared/types"
import { MOCK_PROVIDER_IN_USE_IDS, MOCK_PROVIDERS } from "@/features/fleet/constants/provider.mock"
import { MOCK_VEHICLE_ASSIGNMENTS, MOCK_VEHICLES, type MockVehicleRow } from "@/features/fleet/constants/vehicle.mock"
import type {
  ApiEnvelope,
  Provider,
  ProviderCounts,
  ProviderListParams,
  ProviderPayload,
  ProviderStatus,
  ProviderStatusPayload,
  ProviderUpdatePayload,
  Vehicle,
  VehicleDetail,
  VehicleListParams,
  VehiclePayload,
  VehicleStatusPayload,
  VehicleStatusResult,
  VehicleUpdatePayload,
} from "@/features/fleet/types"
import { computeExpiryStatus, computeWarnings } from "@/features/fleet/utils"

const VEHICLES = "vehicles"
const PROVIDERS = "transport-providers"

/** The BE serves the fleet APIs, so the real Flow 3 API is the default. Set VITE_FLEET_API_MOCKS=true for the local demo data. */
export const useFleetMocks = import.meta.env.VITE_FLEET_API_MOCKS === "true"

/** Error(errorCode) so the UI reacts to contract codes; `errors` carries per-field validation messages. */
export class FleetApiError extends Error {
  backendMessage?: string
  errors?: { field: string; message: string }[]

  constructor(code: string, options?: { cause?: unknown; backendMessage?: string; errors?: { field: string; message: string }[] }) {
    super(code, { cause: options?.cause })
    this.name = "FleetApiError"
    this.backendMessage = options?.backendMessage
    this.errors = options?.errors
  }
}

function wait(delay = 220) {
  return new Promise((resolve) => window.setTimeout(resolve, delay))
}

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "value" in payload) return (payload as ApiEnvelope<T>).value
  return payload as T
}

async function call<T>(request: Promise<unknown>): Promise<T> {
  try {
    return unwrap<T>(await request)
  } catch (error) {
    const data = (error as { response?: { data?: { errorCode?: string; message?: string; errors?: { field: string; message: string }[] } } }).response?.data
    if (data?.errorCode) throw new FleetApiError(data.errorCode, { cause: error, backendMessage: data.message, errors: data.errors })
    throw error
  }
}

interface ApiPage<T> {
  items: T[]
  pageIndex: number
  pageSize: number
  totalItems: number
  totalPages: number
}

function toPaginated<T>(page: ApiPage<T>): PaginatedResponse<T> {
  return {
    data: page.items,
    meta: {
      totalItems: page.totalItems,
      totalPages: page.totalPages,
      itemsPerPage: page.pageSize,
      currentPage: page.pageIndex,
      hasPreviousPage: page.pageIndex > 1,
      hasNextPage: page.pageIndex < page.totalPages,
    },
  }
}

function paginate<T>(list: T[], pageIndex: number, pageSize: number): PaginatedResponse<T> {
  const totalItems = list.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const currentPage = Math.min(Math.max(pageIndex, 1), totalPages)
  return toPaginated({
    items: list.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    pageIndex: currentPage,
    pageSize,
    totalItems,
    totalPages,
  })
}

/** Drops "ALL" / empty values so they never reach the query string. */
function cleanParams(params: Record<string, string | number | undefined>) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== "" && value !== "ALL"))
}

// ---------------------------------------------------------------- vehicles (mock)

let mockVehicles: MockVehicleRow[] = structuredClone(MOCK_VEHICLES)

function toVehicle(row: MockVehicleRow): Vehicle {
  const registrationStatus = computeExpiryStatus(row.registrationExpiryDate)
  const insuranceStatus = computeExpiryStatus(row.insuranceExpiryDate)
  return { ...row, registrationStatus, insuranceStatus, warnings: computeWarnings(registrationStatus, insuranceStatus) }
}

function findMockVehicle(id: string) {
  const row = mockVehicles.find((item) => item.vehicleId === id)
  if (!row) throw new FleetApiError("VEHICLE_NOT_FOUND")
  return row
}

function assertUniqueVehicle(payload: { licensePlate?: string }, ignoreId?: string) {
  const plate = payload.licensePlate?.trim().toLowerCase()
  for (const item of mockVehicles) {
    if (item.vehicleId === ignoreId) continue
    if (plate && item.licensePlate?.toLowerCase() === plate) throw new FleetApiError("LICENSE_PLATE_DUPLICATED")
  }
}

function applyVehiclePayload(row: MockVehicleRow, payload: Partial<VehiclePayload>) {
  const nullable = (value: string | undefined) => (value && value.trim() ? value.trim() : null)
  Object.assign(row, {
    vehicleName: nullable(payload.vehicleName),
    transportMode: payload.transportMode ?? row.transportMode,
    licensePlate: nullable(payload.licensePlate),
    vehicleType: nullable(payload.vehicleType),
    manufacturer: nullable(payload.manufacturer),
    model: nullable(payload.model),
    capacityHorses: payload.capacityHorses ?? row.capacityHorses,
    registrationNumber: nullable(payload.registrationNumber),
    registrationExpiryDate: nullable(payload.registrationExpiryDate),
    insuranceNumber: nullable(payload.insuranceNumber),
    insuranceExpiryDate: nullable(payload.insuranceExpiryDate),
    specialEquipment: nullable(payload.specialEquipment),
    updatedAt: new Date().toISOString(),
  })
}

async function mockVehicleList(params: VehicleListParams): Promise<PaginatedResponse<Vehicle>> {
  await wait()
  const search = params.search.trim().toLowerCase()
  const list = mockVehicles
    .map(toVehicle)
    .filter(
      (vehicle) =>
        (!search ||
          vehicle.vehicleCode.toLowerCase().includes(search) ||
          vehicle.licensePlate?.toLowerCase().includes(search) ||
          vehicle.vehicleName?.toLowerCase().includes(search)) &&
        (params.transportMode === "ALL" || vehicle.transportMode === params.transportMode) &&
        (params.status === "ALL" || vehicle.status === params.status) &&
        (params.vehicleType === "ALL" || vehicle.vehicleType === params.vehicleType) &&
        (params.minCapacity === "ALL" || vehicle.capacityHorses >= params.minCapacity),
    )
  const [field, direction] = params.sortBy.split(":")
  list.sort((left, right) => {
    const sign = direction === "desc" ? -1 : 1
    if (field === "vehicleCode") return sign * left.vehicleCode.localeCompare(right.vehicleCode)
    if (field === "capacityHorses") return sign * (left.capacityHorses - right.capacityHorses)
    return sign * (Date.parse(left.updatedAt) - Date.parse(right.updatedAt))
  })
  return paginate(list, params.pageIndex, params.pageSize)
}

// ---------------------------------------------------------------- vehicles (service)

export const vehicleService = {
  /** VH1 */
  async list(params: VehicleListParams): Promise<PaginatedResponse<Vehicle>> {
    if (useFleetMocks) return mockVehicleList(params)
    const page = await call<ApiPage<Vehicle>>(
      apiClient.get(VEHICLES, {
        params: cleanParams({
          pageIndex: params.pageIndex,
          pageSize: params.pageSize,
          search: params.search.trim(),
          // Internal fleet is road-only (flow3 task doc): the list is always filtered to ROAD.
          transportMode: "ROAD",
          status: params.status,
          vehicleType: params.vehicleType,
          minCapacity: params.minCapacity,
          sortBy: params.sortBy,
        }),
      }),
    )
    return toPaginated(page)
  },

  /** VH2 */
  async get(id: string): Promise<VehicleDetail> {
    if (useFleetMocks) {
      await wait()
      return { ...toVehicle(findMockVehicle(id)), upcomingAssignments: MOCK_VEHICLE_ASSIGNMENTS[id] ?? [] }
    }
    return call<VehicleDetail>(apiClient.get(`${VEHICLES}/${encodeURIComponent(id)}`))
  },

  /** VH3 */
  async create(payload: VehiclePayload): Promise<Vehicle> {
    if (useFleetMocks) {
      await wait()
      assertUniqueVehicle(payload)
      const now = new Date().toISOString()
      const row: MockVehicleRow = {
        vehicleId: crypto.randomUUID(),
        // The BE generates the code; the mock imitates it.
        vehicleCode: `VEH-ROAD-${String(mockVehicles.length + 1).padStart(3, "0")}`,
        vehicleName: null,
        transportMode: payload.transportMode,
        licensePlate: null,
        vehicleType: null,
        manufacturer: null,
        model: null,
        capacityHorses: payload.capacityHorses,
        status: "AVAILABLE",
        registrationNumber: null,
        registrationExpiryDate: null,
        insuranceNumber: null,
        insuranceExpiryDate: null,
        specialEquipment: null,
        createdAt: now,
        updatedAt: now,
      }
      applyVehiclePayload(row, payload)
      mockVehicles = [row, ...mockVehicles]
      return toVehicle(row)
    }
    return call<Vehicle>(apiClient.post(VEHICLES, payload))
  },

  /** VH4 */
  async update(id: string, payload: VehicleUpdatePayload): Promise<{ vehicleId: string; updatedAt: string }> {
    if (useFleetMocks) {
      await wait()
      const row = findMockVehicle(id)
      if (payload.lastUpdatedAt !== row.updatedAt) throw new FleetApiError("VEHICLE_MODIFIED")
      assertUniqueVehicle({ licensePlate: payload.licensePlate }, id)
      applyVehiclePayload(row, payload)
      return { vehicleId: row.vehicleId, updatedAt: row.updatedAt }
    }
    return call(apiClient.put(`${VEHICLES}/${encodeURIComponent(id)}`, payload))
  },

  /** VH5 */
  async changeStatus(id: string, payload: VehicleStatusPayload): Promise<VehicleStatusResult> {
    if (useFleetMocks) {
      await wait()
      const row = findMockVehicle(id)
      if (payload.lastUpdatedAt !== row.updatedAt) throw new FleetApiError("VEHICLE_MODIFIED")
      if (row.status === "ASSIGNED" || row.status === "IN_USE") throw new FleetApiError("VEHICLE_STATUS_LOCKED")
      const previousStatus = row.status
      row.status = payload.status
      row.updatedAt = new Date().toISOString()
      return { vehicleId: row.vehicleId, previousStatus, status: row.status, updatedAt: row.updatedAt }
    }
    return call(apiClient.patch(`${VEHICLES}/${encodeURIComponent(id)}/status`, payload))
  },
}

// ---------------------------------------------------------------- providers (mock)

let mockProviders: Provider[] = structuredClone(MOCK_PROVIDERS)

function findMockProvider(id: string) {
  const provider = mockProviders.find((item) => item.transportProviderId === id)
  if (!provider) throw new FleetApiError("PROVIDER_NOT_FOUND")
  return provider
}

function assertUniqueProvider(payload: { taxCode?: string }, ignoreId?: string) {
  const tax = payload.taxCode?.trim().toLowerCase()
  for (const item of mockProviders) {
    if (item.transportProviderId === ignoreId) continue
    if (tax && item.taxCode?.toLowerCase() === tax) throw new FleetApiError("TAX_CODE_DUPLICATED")
  }
}

function applyProviderPayload(provider: Provider, payload: Partial<ProviderPayload>) {
  const nullable = (value: string | undefined) => (value && value.trim() ? value.trim() : null)
  Object.assign(provider, {
    providerName: payload.providerName?.trim() ?? provider.providerName,
    supportedModes: payload.supportedModes ?? provider.supportedModes,
    taxCode: nullable(payload.taxCode),
    contactName: nullable(payload.contactName),
    phone: nullable(payload.phone),
    email: nullable(payload.email),
    address: nullable(payload.address),
    country: nullable(payload.country),
    note: nullable(payload.note),
    updatedAt: new Date().toISOString(),
  })
}

function filterMockProviders(params: Pick<ProviderListParams, "search" | "supportedMode" | "status">) {
  const search = params.search.trim().toLowerCase()
  return mockProviders.filter(
    (provider) =>
      (!search ||
        provider.providerCode.toLowerCase().includes(search) ||
        provider.providerName.toLowerCase().includes(search) ||
        provider.taxCode?.toLowerCase().includes(search) ||
        provider.contactName?.toLowerCase().includes(search) ||
        provider.country?.toLowerCase().includes(search)) &&
      (params.supportedMode === "ALL" || provider.supportedModes.includes(params.supportedMode)) &&
      (params.status === "ALL" || provider.status === params.status),
  )
}

// ---------------------------------------------------------------- providers (service)

export const providerService = {
  /** PV1 */
  async list(params: ProviderListParams): Promise<PaginatedResponse<Provider>> {
    if (useFleetMocks) {
      await wait()
      const list = filterMockProviders(params)
      const [field, direction] = params.sortBy.split(":")
      list.sort((left, right) => {
        const sign = direction === "desc" ? -1 : 1
        const key = field === "providerCode" ? "providerCode" : field === "createdAt" ? "createdAt" : "providerName"
        return sign * String(left[key]).localeCompare(String(right[key]))
      })
      return paginate(list, params.pageIndex, params.pageSize)
    }
    const page = await call<ApiPage<Provider>>(
      apiClient.get(PROVIDERS, {
        params: cleanParams({
          pageIndex: params.pageIndex,
          pageSize: params.pageSize,
          search: params.search.trim(),
          supportedMode: params.supportedMode,
          status: params.status,
          sortBy: params.sortBy,
        }),
      }),
    )
    return toPaginated(page)
  },

  /** Header cards: total + per status, taken from totalItems of PV1 (the API has no counts endpoint). */
  async counts(): Promise<ProviderCounts> {
    const base = { pageIndex: 1, pageSize: 1, search: "", supportedMode: "ALL", sortBy: "providerName:asc" } as const
    const total = (status: ProviderStatus | "ALL") => this.list({ ...base, status }).then((result) => result.meta.totalItems)
    const [all, active, inactive, suspended] = await Promise.all([total("ALL"), total("ACTIVE"), total("INACTIVE"), total("SUSPENDED")])
    return { total: all, active, inactive, suspended }
  },

  /** PV2 */
  async get(id: string): Promise<Provider> {
    if (useFleetMocks) {
      await wait()
      return structuredClone(findMockProvider(id))
    }
    return call<Provider>(apiClient.get(`${PROVIDERS}/${encodeURIComponent(id)}`))
  },

  /** PV3 */
  async create(payload: ProviderPayload): Promise<Provider> {
    if (useFleetMocks) {
      await wait()
      assertUniqueProvider(payload)
      const now = new Date().toISOString()
      const provider: Provider = {
        transportProviderId: crypto.randomUUID(),
        // The BE generates the code; the mock imitates it.
        providerCode: `PRV-${String(mockProviders.length + 1).padStart(3, "0")}`,
        providerName: payload.providerName.trim(),
        status: "ACTIVE",
        supportedModes: payload.supportedModes,
        taxCode: null,
        contactName: null,
        phone: null,
        email: null,
        address: null,
        country: null,
        note: null,
        createdAt: now,
        updatedAt: now,
      }
      applyProviderPayload(provider, payload)
      mockProviders = [provider, ...mockProviders]
      return structuredClone(provider)
    }
    return call<Provider>(apiClient.post(PROVIDERS, payload))
  },

  /** PV4 */
  async update(id: string, payload: ProviderUpdatePayload): Promise<{ transportProviderId: string; updatedAt: string }> {
    if (useFleetMocks) {
      await wait()
      const provider = findMockProvider(id)
      if (payload.lastUpdatedAt !== provider.updatedAt) throw new FleetApiError("PROVIDER_MODIFIED")
      assertUniqueProvider({ taxCode: payload.taxCode }, id)
      applyProviderPayload(provider, payload)
      return { transportProviderId: provider.transportProviderId, updatedAt: provider.updatedAt }
    }
    return call(apiClient.put(`${PROVIDERS}/${encodeURIComponent(id)}`, payload))
  },

  /** PV5 */
  async changeStatus(id: string, payload: ProviderStatusPayload): Promise<{ transportProviderId: string; status: ProviderStatus; updatedAt: string }> {
    if (useFleetMocks) {
      await wait()
      const provider = findMockProvider(id)
      if (payload.lastUpdatedAt !== provider.updatedAt) throw new FleetApiError("PROVIDER_MODIFIED")
      provider.status = payload.status
      provider.updatedAt = new Date().toISOString()
      return { transportProviderId: provider.transportProviderId, status: provider.status, updatedAt: provider.updatedAt }
    }
    return call(apiClient.patch(`${PROVIDERS}/${encodeURIComponent(id)}/status`, payload))
  },

  /** PV6 */
  async remove(id: string): Promise<void> {
    if (useFleetMocks) {
      await wait()
      findMockProvider(id)
      if (MOCK_PROVIDER_IN_USE_IDS.has(id)) throw new FleetApiError("PROVIDER_IN_USE")
      mockProviders = mockProviders.filter((item) => item.transportProviderId !== id)
      return
    }
    await call(apiClient.delete(`${PROVIDERS}/${encodeURIComponent(id)}`))
  },
}
