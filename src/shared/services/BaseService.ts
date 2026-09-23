import type { AxiosInstance } from 'axios'
import apiClient from '@/lib/axios'
import type { EntityId, PaginatedResponse, SelectOption } from '@/shared/types'

export interface BaseServiceConfig<TEntity, TCreateDto, TUpdateDto, TFilterParams> {
  endpoint: string
  axios?: AxiosInstance
  getAll?: (params?: TFilterParams) => Promise<PaginatedResponse<TEntity>>
  getById?: (id: EntityId) => Promise<TEntity>
  create?: (data: TCreateDto) => Promise<TEntity>
  update?: (id: EntityId, data: TUpdateDto) => Promise<TEntity>
  remove?: (id: EntityId) => Promise<void>
  getSelectOptions?: () => Promise<SelectOption[]>
}

export interface BaseService<TEntity, TCreateDto, TUpdateDto, TFilterParams> {
  getAll: (params?: TFilterParams) => Promise<PaginatedResponse<TEntity>>
  getById: (id: EntityId) => Promise<TEntity>
  create: (data: TCreateDto) => Promise<TEntity>
  update: (id: EntityId, data: TUpdateDto) => Promise<TEntity>
  remove: (id: EntityId) => Promise<void>
  getSelectOptions: () => Promise<SelectOption[]>
}

export function createBaseService<
  TEntity,
  TCreateDto = Partial<TEntity>,
  TUpdateDto = Partial<TEntity>,
  TFilterParams = Record<string, unknown>,
>(
  config: BaseServiceConfig<TEntity, TCreateDto, TUpdateDto, TFilterParams>,
): BaseService<TEntity, TCreateDto, TUpdateDto, TFilterParams> {
  const axiosInstance = config.axios ?? apiClient
  const endpoint = config.endpoint.replace(/\/$/, '')
  const resourceUrl = (id: EntityId) => `${endpoint}/${encodeURIComponent(String(id))}`

  return {
    getAll:
      config.getAll ??
      ((params) =>
        axiosInstance.get(endpoint, { params }) as unknown as Promise<PaginatedResponse<TEntity>>),
    getById:
      config.getById ??
      ((id) => axiosInstance.get(resourceUrl(id)) as unknown as Promise<TEntity>),
    create:
      config.create ??
      ((data) => axiosInstance.post(endpoint, data) as unknown as Promise<TEntity>),
    update:
      config.update ??
      ((id, data) => axiosInstance.put(resourceUrl(id), data) as unknown as Promise<TEntity>),
    remove:
      config.remove ??
      (async (id) => {
        await axiosInstance.delete(resourceUrl(id))
      }),
    getSelectOptions:
      config.getSelectOptions ??
      (() => axiosInstance.get(`${endpoint}/select`) as unknown as Promise<SelectOption[]>),
  }
}
