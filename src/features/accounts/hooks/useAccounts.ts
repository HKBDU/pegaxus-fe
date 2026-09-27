import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { EntityId } from "@/shared/types"
import { accountService } from "../services"
import type { EmployeeListParams, EmploymentUpdate } from "../types"

export const accountKeys = {
  lists: () => ["accounts", "employees", "list"] as const,
  list: (params: EmployeeListParams) => [...accountKeys.lists(), params] as const,
  detail: (id: EntityId) => ["accounts", "employees", "detail", String(id)] as const,
}
export function useEmployees(params: EmployeeListParams) {
  return useQuery({ queryKey: accountKeys.list(params), queryFn: () => accountService.getEmployees(params), placeholderData: (previous) => previous })
}
export function useEmployee(id: EntityId) {
  return useQuery({ queryKey: accountKeys.detail(id), queryFn: () => accountService.getEmployee(id), enabled: String(id).length > 0 })
}
export function useSuspendEmployee() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: EntityId) => accountService.setStatus(id, "SUSPENDED"),
    onSuccess: async (_, id) => {
      await Promise.all([client.invalidateQueries({ queryKey: accountKeys.lists() }), client.invalidateQueries({ queryKey: accountKeys.detail(id) })])
    },
  })
}
export function useUpdateEmployment() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, changes }: { id: EntityId; changes: EmploymentUpdate }) => accountService.updateEmployment(id, changes),
    onSuccess: async (_, { id }) => {
      await Promise.all([client.invalidateQueries({ queryKey: accountKeys.lists() }), client.invalidateQueries({ queryKey: accountKeys.detail(id) })])
    },
  })
}
