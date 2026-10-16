import type { AxiosInstance } from 'axios'
import apiClient from '@/lib/axios'
import type { EntityId, PaginatedResponse, SelectOption } from '@/shared/types'

export interface BaseServiceConfig<
  TEntity,
  TCreateDto,
  TUpdateDto,
  TFilterParams,
  TCreateResult = TEntity,
  TUpdateResult = TEntity,
  TListEntity = TEntity,
  TDetailEntity = TEntity,
> {
  endpoint: string
  axios?: AxiosInstance
  getAll?: (params?: TFilterParams) => Promise<PaginatedResponse<TListEntity>>
  getById?: (id: EntityId) => Promise<TDetailEntity>
  create?: (data: TCreateDto) => Promise<TCreateResult>
  update?: (id: EntityId, data: TUpdateDto) => Promise<TUpdateResult>
  remove?: (id: EntityId) => Promise<void>
  getSelectOptions?: () => Promise<SelectOption[]>
}

export interface BaseService<
  TEntity,
  TCreateDto,
  TUpdateDto,
  TFilterParams,
  TCreateResult = TEntity,
  TUpdateResult = TEntity,
  TListEntity = TEntity,
  TDetailEntity = TEntity,
> {
  getAll: (params?: TFilterParams) => Promise<PaginatedResponse<TListEntity>>
  getById: (id: EntityId) => Promise<TDetailEntity>
  create: (data: TCreateDto) => Promise<TCreateResult>
  update: (id: EntityId, data: TUpdateDto) => Promise<TUpdateResult>
  remove: (id: EntityId) => Promise<void>
  getSelectOptions: () => Promise<SelectOption[]>
}

export function createBaseService<
  TEntity,
  TCreateDto = Partial<TEntity>,
  TUpdateDto = Partial<TEntity>,
  TFilterParams = Record<string, unknown>,
  TCreateResult = TEntity,
  TUpdateResult = TEntity,
  TListEntity = TEntity,
  TDetailEntity = TEntity,
>(
  config: BaseServiceConfig<
    TEntity,
    TCreateDto,
    TUpdateDto,
    TFilterParams,
    TCreateResult,
    TUpdateResult,
    TListEntity,
    TDetailEntity
  >,
): BaseService<
  TEntity,
  TCreateDto,
  TUpdateDto,
  TFilterParams,
  TCreateResult,
  TUpdateResult,
  TListEntity,
  TDetailEntity
> {
  const axiosInstance = config.axios ?? apiClient
  const endpoint = config.endpoint.replace(/\/$/, '')
  const resourceUrl = (id: EntityId) => `${endpoint}/${encodeURIComponent(String(id))}`

  return {
    getAll:
      config.getAll ??
      ((params) =>
        axiosInstance.get(endpoint, { params }) as unknown as Promise<PaginatedResponse<TListEntity>>),
    getById:
      config.getById ??
      ((id) => axiosInstance.get(resourceUrl(id)) as unknown as Promise<TDetailEntity>),
    create:
      config.create ??
      ((data) => axiosInstance.post(endpoint, data) as unknown as Promise<TCreateResult>),
    update:
      config.update ??
      ((id, data) => axiosInstance.put(resourceUrl(id), data) as unknown as Promise<TUpdateResult>),
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
