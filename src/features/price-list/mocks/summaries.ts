import type { PriceListSummary } from "../list.schemas"

export const priceListSummaryMocks: PriceListSummary[] = [
  { priceListId: "11111111-1111-4111-8111-111111111111", name: "Default price list", currency: "VND", taxRate: 20, depositRate: 40, isActive: true, itemCount: 11, createdAt: "2026-11-04T08:00:00Z", updatedAt: "2026-11-04T08:00:00Z" },
  { priceListId: "22222222-2222-4222-8222-222222222222", name: "Bảng Giá Q1-2027", currency: "VND", taxRate: 10, depositRate: 30, isActive: false, itemCount: 11, createdAt: "2026-11-05T08:00:00Z", updatedAt: "2026-11-05T08:00:00Z" },
]
