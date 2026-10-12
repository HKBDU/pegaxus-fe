import { Loader2 } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { ROLE_LABEL, ROUTE_PLAN_STATUS_LABEL, TRANSPORT_PLAN_STATUS_LABEL } from "@/features/personnel/constants"
import { useAssignableEmployees } from "@/features/personnel/hooks"
import type {
  AssignableRole,
  ComplianceDossierStatus,
  EmployeeBrief,
  RoutePlanStatus,
  TransportPlanStatus,
  TransportPlanSummary,
} from "@/features/personnel/types"
import { employeeLabel, formatDate, type SegmentAssignmentState } from "@/features/personnel/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Skeleton } from "@/shared/components/ui/skeleton"

export const labelClass = "font-heading text-[10px] font-semibold uppercase leading-4 tracking-[0.08em] text-[#181818]"
export const controlClass =
  "h-9 w-full rounded-[2px] border-0 bg-[#f3f3f3] px-2.5 text-xs font-normal text-[#181818] shadow-none focus-visible:ring-2 focus-visible:ring-primary/40"

type Tone = "green" | "amber" | "red" | "blue" | "slate" | "orange"

const toneClass: Record<Tone, string> = {
  green: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-600",
  blue: "bg-sky-100 text-sky-700",
  slate: "bg-slate-200 text-slate-600",
  orange: "bg-orange-100 text-orange-700",
}

export function Chip({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-5 items-center whitespace-nowrap rounded-[3px] px-2 text-[10px] font-bold uppercase leading-none tracking-[0.04em]", toneClass[tone], className)}>
      {children}
    </span>
  )
}

const planTone: Record<TransportPlanStatus, Tone> = {
  DRAFT: "slate",
  PENDING: "amber",
  APPROVED: "green",
  IN_PROGRESS: "blue",
  COMPLETED: "slate",
  CANCELLED: "red",
}

export function TransportPlanStatusChip({ status }: { status: TransportPlanStatus }) {
  return <Chip tone={planTone[status]}>{TRANSPORT_PLAN_STATUS_LABEL[status]}</Chip>
}

const routeTone: Record<RoutePlanStatus, Tone> = {
  DRAFT: "amber",
  CONFIRMED: "green",
  ACTIVE: "blue",
  COMPLETED: "slate",
  CANCELLED: "red",
}

export function RoutePlanStatusChip({ status }: { status: RoutePlanStatus }) {
  return <Chip tone={routeTone[status]}>{ROUTE_PLAN_STATUS_LABEL[status]}</Chip>
}

const dossierTone: Record<ComplianceDossierStatus, Tone> = {
  DRAFT: "slate",
  IN_PREPARATION: "amber",
  READY_FOR_SUBMISSION: "blue",
  SUBMITTED: "blue",
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
  CLOSED: "slate",
}

/** Chip of ComplianceDossier.status (PS2 `complianceDossier`). Display only, nothing branches on it. */
export function ComplianceDossierChip({ status }: { status: ComplianceDossierStatus }) {
  return <Chip tone={dossierTone[status]}>{status.replaceAll("_", " ")}</Chip>
}

/** Round avatar: Account.avatar_url when the BE sends one, initials otherwise. */
export function EmployeeAvatar({ employee, className }: { employee: Pick<EmployeeBrief, "fullName" | "avatarUrl">; className?: string }) {
  const initials = employee.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
  return employee.avatarUrl ? (
    <img src={employee.avatarUrl} alt="" className={cn("size-10 shrink-0 rounded-full object-cover", className)} />
  ) : (
    <span aria-hidden="true" className={cn("grid size-10 shrink-0 place-items-center rounded-full bg-slate-200 text-xs font-bold text-slate-600", className)}>
      {initials || "?"}
    </span>
  )
}

/** Employee card shown under the dropdowns. Only fields the API returns. */
export function EmployeeCard({ employee, className }: { employee: EmployeeBrief; className?: string }) {
  const role = employee.role in ROLE_LABEL ? ROLE_LABEL[employee.role as AssignableRole] : employee.role
  return (
    <div className={cn("flex items-center gap-3 border bg-slate-50 p-3", className)}>
      <EmployeeAvatar employee={employee} />
      <div className="grid min-w-0 leading-tight">
        <span className="font-mono text-[10px] text-slate-500">{employee.employeeCode}</span>
        <span className="truncate text-sm font-bold text-slate-900">{employee.fullName}</span>
        <span className="truncate text-[11px] text-slate-500">{role}</span>
      </div>
    </div>
  )
}

const stateMeta: Record<SegmentAssignmentState, { tone: Tone; label: string }> = {
  PROVIDER: { tone: "blue", label: "Provider" },
  ASSIGNED: { tone: "green", label: "Assigned" },
  INCOMPLETE: { tone: "amber", label: "Incomplete" },
  NOT_ASSIGNED: { tone: "red", label: "Not assigned" },
}

export function AssignmentStateChip({ state }: { state: SegmentAssignmentState }) {
  const { tone, label } = stateMeta[state]
  return <Chip tone={tone}>{label}</Chip>
}

export function SegmentTypeChip({ outsourced }: { outsourced: boolean }) {
  return outsourced ? <Chip tone="blue">Outsourced</Chip> : <Chip tone="green">Internal</Chip>
}

/** Plan facts the dashboard and the dialogs show in a strip. */
export function PlanSummaryStrip({ plan, className }: { plan: TransportPlanSummary; className?: string }) {
  const route = [plan.booking.originAddress, plan.booking.destinationAddress].filter(Boolean).join(" → ") || "—"
  const items: { label: string; value: ReactNode }[] = [
    { label: "Transport plan", value: plan.planCode },
    { label: "Booking", value: plan.booking.bookingCode },
    { label: "Customer", value: plan.booking.customerName },
    { label: "Route", value: route },
    { label: "Status", value: <TransportPlanStatusChip status={plan.status} /> },
    { label: "Horses", value: plan.booking.totalHorses },
    { label: "Planned start", value: formatDate(plan.plannedStartAt) },
  ]
  return (
    <dl className={cn("m-0 grid gap-x-6 gap-y-3 border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className={labelClass}>{item.label}</dt>
          <dd className="m-0 mt-1 truncate text-sm font-semibold text-slate-900" title={typeof item.value === "string" ? item.value : undefined}>
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

const KEEP = "__keep__"

interface EmployeeSelectProps {
  role: AssignableRole
  value: string
  /** Second argument is the picked employee (undefined when cleared), so callers can keep it for later messages. */
  onChange: (employeeId: string, employee?: EmployeeBrief) => void
  /** Planned window of the segment (DRIVER / ESCORT only). */
  window?: { from?: string; to?: string }
  placeholder?: string
  /** Optional selects: adds a "keep current" entry that maps to an empty value. */
  keepLabel?: string
  /** Kept in the list even when the BE no longer returns them (e.g. the current assignee). */
  current?: EmployeeBrief | null
  /** Hidden from the list (e.g. the person that just caused a schedule conflict). */
  excludeIds?: string[]
  disabled?: boolean
  invalid?: boolean
  ariaLabel: string
}

/** PS6-backed dropdown. The BE already filtered by role and availability, so the list is shown as returned. */
export function EmployeeSelect({
  role,
  value,
  onChange,
  window,
  placeholder = "Select employee",
  keepLabel,
  current,
  excludeIds,
  disabled,
  invalid,
  ariaLabel,
}: EmployeeSelectProps) {
  const query = useAssignableEmployees(role, window)
  const items = (query.data?.items ?? []).filter((employee) => !excludeIds?.includes(employee.employeeId))
  const hasCurrent = current ? items.some((employee) => employee.employeeId === current.employeeId) : true
  const options = current && !hasCurrent ? [current, ...items] : items
  const waitingForWindow = (role === "DRIVER" || role === "ESCORT") && !(window?.from && window?.to)

  return (
    <div className="grid gap-1">
      <Select value={value || (keepLabel ? KEEP : "")} onValueChange={(next) => onChange(next === KEEP ? "" : next, options.find((employee) => employee.employeeId === next))} disabled={disabled || waitingForWindow}>
        <SelectTrigger aria-label={ariaLabel} aria-invalid={invalid || undefined} className={cn(controlClass, "justify-between", invalid && "ring-2 ring-red-400/60")}>
          <SelectValue placeholder={query.isLoading ? "Loading..." : placeholder} />
          {query.isFetching ? <Loader2 className="ml-1 size-3 shrink-0 animate-spin text-slate-400" aria-hidden="true" /> : null}
        </SelectTrigger>
        <SelectContent className="max-h-72 rounded-[2px]">
          {keepLabel ? <SelectItem value={KEEP} className="text-xs italic text-slate-500">{keepLabel}</SelectItem> : null}
          {options.map((employee) => (
            <SelectItem key={employee.employeeId} value={employee.employeeId} className="text-xs">
              {employeeLabel(employee)}
              {current?.employeeId === employee.employeeId ? " (current)" : ""}
            </SelectItem>
          ))}
          {!options.length && !query.isLoading ? (
            <p className="m-0 px-2 py-2 text-xs text-slate-500">
              {query.isError ? "Unable to load employees." : "No employee is available for this role / time window."}
            </p>
          ) : null}
        </SelectContent>
      </Select>
    </div>
  )
}

export function PersonnelSkeleton() {
  return (
    <div className="grid gap-5" aria-busy="true" aria-label="Loading personnel assignment">
      <div className="booking-panel booking-page-enter grid gap-3 border bg-white p-5">
        <Skeleton className="h-6 w-64 rounded-none bg-slate-200" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-24 rounded-none bg-slate-100" />
          <Skeleton className="h-24 rounded-none bg-slate-100" />
        </div>
      </div>
      <div className="booking-panel booking-page-enter grid gap-3 border bg-white p-5">
        <Skeleton className="h-6 w-72 rounded-none bg-slate-200" />
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-10 rounded-none bg-slate-100" />
        ))}
      </div>
    </div>
  )
}
