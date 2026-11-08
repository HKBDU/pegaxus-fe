import { z } from "zod"

export const priceListSummarySchema = z.object({
  priceListId: z.string().uuid(),
  name: z.string(),
  currency: z.string(),
  taxRate: z.number(),
  depositRate: z.number(),
  isActive: z.boolean(),
  itemCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type PriceListSummary = z.infer<typeof priceListSummarySchema>
export const priceListSortOptions = ["createdAt:desc", "createdAt:asc", "updatedAt:desc", "updatedAt:asc", "name:asc", "name:desc"] as const
export type PriceListSortBy = (typeof priceListSortOptions)[number]

export interface PriceListQueryParams {
  pageIndex?: number
  pageSize?: number
  search?: string
  isActive?: boolean
  sortBy?: PriceListSortBy
}

export interface PriceListPage {
  items: PriceListSummary[]
  pageIndex: number
  pageSize: number
  totalItems: number
  totalPages: number
}
