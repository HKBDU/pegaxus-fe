import type { EmployeeListParams } from "./types";

export { employeeRoles } from "./schemas";
export const initialEmployeeParams: EmployeeListParams = {
  pageIndex: 1,
  pageSize: 10,
  search: "",
  role: "ALL",
  accountStatus: "ALL",
  workingStatus: "ALL",
  sortBy: ["createdAt:desc"],
};
export function formatAccountLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export const employeeStatusBadgeClass =
  "h-5 gap-1 rounded-full border px-2 py-0 text-[10px] font-medium";
export function getEmployeeStatusBadgeClass(status: string) {
  if (status === "ACTIVE")
    return "border-emerald-300 bg-emerald-50 text-emerald-700";
  if (status === "SUSPENDED") return "border-red-300 bg-red-50 text-red-700";
  return "border-slate-300 bg-slate-100 text-slate-600";
}
