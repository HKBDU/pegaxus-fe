export type EntityId = string | number

export interface PaginationMeta {
  totalItems: number
  totalPages: number
  itemsPerPage: number
  currentPage: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

export interface SelectOption {
  id: string
  name: string
}

export interface BaseFilterParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  search?: string
}
