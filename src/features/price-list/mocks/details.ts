import { ACTIVE_PRICELIST_LOCKED, DUPLICATE_ITEM_CODE, PRICE_LIST_ITEM_MODIFIED, PRICE_LIST_ITEM_NOT_FOUND, PRICE_LIST_NOT_FOUND } from "@/features/price-list/constants"
import { PriceListApiError } from "@/features/price-list/errors"
import type { CreatePriceListItemPayload, PriceListDetail, PriceListItem, UpdatePriceListItemPayload } from "@/features/price-list/types"

/**
 * Demo data so the detail page and the line form work before the BE is reachable.
 * Turn it on with VITE_PRICE_LIST_API_MOCKS=true (development only). The data lives in memory: a reload resets it.
 */
export const priceListMocksEnabled = import.meta.env.DEV && import.meta.env.VITE_PRICE_LIST_API_MOCKS === "true"

export const MOCK_ACTIVE_PRICE_LIST_ID = "00000000-0000-0000-0000-00000000b001"
export const MOCK_INACTIVE_PRICE_LIST_ID = "00000000-0000-0000-0000-00000000b002"

/** Microseconds on purpose: it proves the screens send `updatedAt` back untouched (A-01). */
const SEED_TIME = "2026-11-04T00:00:00.123456+00:00"

type SeedItem = [code: string, name: string, type: PriceListItem["itemType"], unit: PriceListItem["unit"], price: number, tier: PriceListItem["vehicleTier"], order: number]

// business/price-list.md, 5.4
const DEFAULT_ITEMS: SeedItem[] = [
  ["TRUCK_S", "Base vehicle fare, Tier S", "TRANSPORT_FEE", "TRIP", 1600, "S", 10],
  ["TRUCK_M", "Base vehicle fare, Tier M", "TRANSPORT_FEE", "TRIP", 2400, "M", 10],
  ["TRUCK_L", "Base vehicle fare, Tier L", "TRANSPORT_FEE", "TRIP", 3400, "L", 10],
  ["HORSE_LOAD", "Load and compartment surcharge", "TRANSPORT_FEE", "HORSE", 120, null, 20],
  ["FEEDING", "Feed and electrolyte water", "HORSE_SERVICE_FEE", "HORSE_DAY", 35, null, 30],
  ["MEDICAL", "Veterinary care and sterile bedding", "HORSE_SERVICE_FEE", "HORSE", 110, null, 40],
  ["HANDLING", "Hydraulic lift handling and e-POD", "HANDLING_FEE", "HORSE", 50, null, 50],
  ["DISINFECTION", "Vehicle biosecurity disinfection", "HANDLING_FEE", "TRIP", 150, null, 60],
  ["COMPLIANCE_FILING", "TRACES-NT and customs filing", "COMPLIANCE_FEE", "TRIP", 250, null, 70],
  ["CLINICAL_CHECK", "Clinical exam and microchip check at BCP", "COMPLIANCE_FEE", "HORSE", 90, null, 80],
  ["INSURANCE", "Equine transit liability insurance", "OTHER", "HORSE", 80, null, 90],
]

// Tier L is missing on purpose, to show the "Missing: required to activate" chip.
const DRAFT_ITEMS: SeedItem[] = [
  ["TRUCK_S", "Base vehicle fare, Tier S", "TRANSPORT_FEE", "TRIP", 1800, "S", 10],
  ["TRUCK_M", "Base vehicle fare, Tier M", "TRANSPORT_FEE", "TRIP", 2600, "M", 10],
  ["FEEDING", "Feed and electrolyte water", "HORSE_SERVICE_FEE", "HORSE_DAY", 40, null, 30],
]

function buildItems(priceListId: string, seeds: SeedItem[], idPrefix: string): PriceListItem[] {
  return seeds.map(([itemCode, itemName, itemType, unit, unitPrice, vehicleTier, sortOrder], index) => ({
    priceListItemId: `${idPrefix}${String(index + 1).padStart(2, "0")}`,
    priceListId,
    itemCode,
    itemName,
    itemType,
    unit,
    unitPrice,
    vehicleTier,
    sortOrder,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  }))
}

function seed(): Map<string, PriceListDetail> {
  const lists: PriceListDetail[] = [
    {
      priceListId: MOCK_ACTIVE_PRICE_LIST_ID,
      name: "Default price list",
      currency: "VND",
      taxRate: 20,
      depositRate: 40,
      isActive: true,
      createdAt: SEED_TIME,
      updatedAt: SEED_TIME,
      createdByAccountId: null,
      updatedByAccountId: null,
      items: buildItems(MOCK_ACTIVE_PRICE_LIST_ID, DEFAULT_ITEMS, "00000000-0000-0000-0000-00000000b1"),
    },
    {
      priceListId: MOCK_INACTIVE_PRICE_LIST_ID,
      name: "Bảng Giá Q1-2027",
      currency: "VND",
      taxRate: 10,
      depositRate: 30,
      isActive: false,
      createdAt: SEED_TIME,
      updatedAt: SEED_TIME,
      createdByAccountId: "9d6f1c0a-5b7e-4a1c-8f3d-2a9b6c4e1d70",
      updatedByAccountId: null,
      items: buildItems(MOCK_INACTIVE_PRICE_LIST_ID, DRAFT_ITEMS, "00000000-0000-0000-0000-00000000b2"),
    },
  ]
  return new Map(lists.map((list) => [list.priceListId, list]))
}

let store = seed()

/** Test helper: back to the seed data. */
export function resetPriceListMocks() {
  store = seed()
}

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms))

/** `2026-11-06T10:00:00.123Z` -> `2026-11-06T10:00:00.123789+00:00`, like the BE strings. */
function nextTimestamp() {
  return `${new Date().toISOString().slice(0, -1)}789+00:00`
}

function sortItems(items: PriceListItem[]) {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.itemCode.localeCompare(b.itemCode))
}

function findList(priceListId: string) {
  const list = store.get(priceListId)
  if (!list) throw new PriceListApiError(PRICE_LIST_NOT_FOUND)
  return list
}

export async function mockGetPriceList(priceListId: string): Promise<PriceListDetail> {
  await wait()
  const list = findList(priceListId)
  return structuredClone({ ...list, items: sortItems(list.items) })
}

export async function mockCreatePriceListItem(priceListId: string, payload: CreatePriceListItemPayload): Promise<PriceListItem> {
  await wait()
  const list = findList(priceListId)
  if (list.isActive) throw new PriceListApiError(ACTIVE_PRICELIST_LOCKED)
  if (list.items.some((item) => item.itemCode === payload.itemCode)) throw new PriceListApiError(DUPLICATE_ITEM_CODE)
  const lastOrder = list.items.reduce((max, item) => Math.max(max, item.sortOrder), 0)
  const now = nextTimestamp()
  const item: PriceListItem = {
    ...payload,
    sortOrder: payload.sortOrder ?? lastOrder + 10,
    priceListItemId: crypto.randomUUID(),
    priceListId,
    createdAt: now,
    updatedAt: now,
  }
  list.items.push(item)
  return structuredClone(item)
}

export async function mockUpdatePriceListItem(priceListId: string, priceListItemId: string, payload: UpdatePriceListItemPayload): Promise<PriceListItem> {
  await wait()
  const list = findList(priceListId)
  const index = list.items.findIndex((item) => item.priceListItemId === priceListItemId)
  if (index < 0) throw new PriceListApiError(PRICE_LIST_ITEM_NOT_FOUND)
  const current = list.items[index]
  if (payload.lastUpdatedAt !== current.updatedAt) throw new PriceListApiError(PRICE_LIST_ITEM_MODIFIED)
  const sortOrder = payload.sortOrder ?? current.sortOrder
  // An active list is locked as a whole: no line can be changed.
  if (list.isActive) throw new PriceListApiError(ACTIVE_PRICELIST_LOCKED)
  const unchanged =
    payload.itemName === current.itemName && payload.itemType === current.itemType && payload.unit === current.unit &&
    payload.unitPrice === current.unitPrice && payload.vehicleTier === current.vehicleTier && sortOrder === current.sortOrder
  // Sending the same data again changes nothing (business/price-list.md, 3.9).
  if (unchanged) return structuredClone(current)
  const saved: PriceListItem = { ...current, itemName: payload.itemName, itemType: payload.itemType, unit: payload.unit, unitPrice: payload.unitPrice, vehicleTier: payload.vehicleTier, sortOrder, updatedAt: nextTimestamp() }
  list.items[index] = saved
  return structuredClone(saved)
}
