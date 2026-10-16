import apiClient from "@/lib/axios";
import type { EntityId, PaginatedResponse } from "@/shared/types";
import { employeeDetailSchema, employeeListSchema } from "./schemas";
import type {
  CreateEmployee,
  EmployeeAccount,
  EmployeeListParams,
  EmploymentUpdate,
} from "./types";

function unwrap(payload: unknown): unknown {
  if (payload && typeof payload === "object" && "value" in payload)
    return payload.value;
  return payload;
}

export function getAccountErrorCode(error: unknown) {
  const data = (
    error as {
      response?: {
        data?: { errorCode?: string; data?: { errorCode?: string } };
      };
    }
  )?.response?.data;
  return data?.errorCode ?? data?.data?.errorCode;
}

export function getAccountError(error: unknown) {
  const code = getAccountErrorCode(error);
  if (code === "EMPLOYEE_NOT_FOUND") return "Employee account not found.";
  if (code === "INVALID_SORT_PARAMETER")
    return "The selected sort order is not supported.";
  if (code === "EMAIL_ALREADY_EXISTS")
    return "This email address is already registered.";
  return "Unable to complete the employee account request. Please try again.";
}

export const accountService = {
  async createEmployee(values: CreateEmployee) {
    await apiClient.post("employees", values);
  },
  async getEmployees(
    params: EmployeeListParams,
  ): Promise<PaginatedResponse<EmployeeAccount>> {
    const payload = await apiClient.get<unknown, unknown>("employees", {
      params: {
        pageIndex: params.pageIndex,
        pageSize: params.pageSize,
        search: params.search.trim() || undefined,
        role: params.role === "ALL" ? undefined : params.role,
        accountStatus:
          params.accountStatus === "ALL" ? undefined : params.accountStatus,
        workingStatus:
          params.workingStatus === "ALL" ? undefined : params.workingStatus,
        sortBy: params.sortBy,
      },
    });
    const value = employeeListSchema.parse(unwrap(payload));
    return {
      data: value.items,
      meta: {
        currentPage: value.pageIndex,
        itemsPerPage: value.pageSize,
        totalItems: value.totalItems,
        totalPages: value.totalPages,
        hasPreviousPage: value.pageIndex > 1,
        hasNextPage: value.pageIndex < value.totalPages,
      },
    };
  },
  async getEmployee(employeeId: EntityId) {
    return employeeDetailSchema.parse(
      unwrap(
        await apiClient.get<unknown, unknown>(
          `employees/${encodeURIComponent(employeeId)}`,
        ),
      ),
    );
  },
  async updateEmployment(employeeId: EntityId, changes: EmploymentUpdate) {
    await apiClient.patch(`employees/${encodeURIComponent(employeeId)}`, {
      role: changes.role,
      workingStatus: changes.workingStatus,
    });
  },
  async setStatus(
    employeeId: EntityId,
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED",
  ) {
    await apiClient.patch(
      `employees/${encodeURIComponent(employeeId)}/status`,
      { status },
    );
  },
};
