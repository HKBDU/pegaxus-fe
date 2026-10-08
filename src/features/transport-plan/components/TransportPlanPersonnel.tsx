import { UserRound } from "lucide-react"
import type { EntityId } from "@/shared/types"
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar"
import { EmptyState, ErrorState } from "@/shared/components/common"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { useTransportPlanAssignments } from "../hooks/useTransportPlans"
import { formatPlanDate } from "../format"
import { getTransportPlanError } from "../transport-plan.services"
import type { EmployeeBrief, TransportPlanAssignments } from "../transport-plan.types"
import { Field, Section } from "./ApprovedBookingDetails"
import { ApprovedBookingBadge } from "./ApprovedBookingBadge"

function Employee({ employee }: { employee?: EmployeeBrief | null }) {
  if (!employee) return <span className="text-sm text-slate-500">Not assigned</span>
  return <div className="flex items-center gap-2">
    <Avatar size="sm"><AvatarFallback><UserRound aria-hidden="true" className="size-3.5" /></AvatarFallback></Avatar>
    <div className="min-w-0"><p className="break-words text-sm font-medium">{employee.fullName}</p><p className="mt-0.5 text-xs text-slate-500">{employee.employeeCode}</p></div>
  </div>
}

export function PersonnelDetails({ assignments }: { assignments: TransportPlanAssignments }) {
  const phase2 = assignments.phase2
  const hasPhase2 = phase2 && (phase2.enabled || phase2.routePlanId != null || Boolean(phase2.segments?.length))
  return <div className="space-y-5">
    <Section title="Phase 1 — Planning personnel">
      <dl className="grid gap-5 sm:grid-cols-2">
        <Field label="Transport Specialist"><Employee employee={assignments.phase1?.transportSpecialist} /></Field>
        <Field label="Route Coordinator"><Employee employee={assignments.phase1?.routeCoordinator} /></Field>
      </dl>
    </Section>
    {!hasPhase2 ? <EmptyState message="No phase 2 personnel assignments are available yet." /> : <Section title="Phase 2 — Segment personnel">
      <dl className="mb-4 grid gap-5 sm:grid-cols-3">
        <Field label="Phase 2 enabled">{phase2.enabled ? "Yes" : "No"}</Field>
        <Field label="Route plan reference">{phase2.routePlanId == null ? "—" : String(phase2.routePlanId)}</Field>
        <Field label="Personnel status">{phase2.personnelStatus ? <ApprovedBookingBadge value={phase2.personnelStatus} /> : "—"}</Field>
      </dl>
      {!phase2.segments?.length ? <EmptyState message="No segment personnel assignments are available." /> : <Table>
        <TableHeader className="bg-[#e9e6de]"><TableRow>{["Segment", "Execution", "Schedule", "Driver", "Escort", "Provider", "Complete"].map((label) => <TableHead key={label} className="whitespace-nowrap font-heading text-xs uppercase">{label}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{phase2.segments.map((segment) => <TableRow key={segment.routePlanRouteId}>
          <TableCell>{segment.sequenceNo}</TableCell><TableCell><ApprovedBookingBadge value={segment.executionType} /></TableCell>
          <TableCell className="whitespace-nowrap text-xs"><p>{formatPlanDate(segment.plannedDepartureAt)}</p><p className="mt-1 text-slate-500">{formatPlanDate(segment.plannedArrivalAt)}</p></TableCell>
          <TableCell><Employee employee={segment.driver} /></TableCell><TableCell><Employee employee={segment.escort} /></TableCell>
          <TableCell>{segment.provider?.providerName || "—"}</TableCell>
          <TableCell>{segment.isComplete == null ? "—" : segment.isComplete ? "Yes" : "No"}</TableCell>
        </TableRow>)}</TableBody>
      </Table>}
    </Section>}
  </div>
}

export function TransportPlanPersonnel({ transportPlanId }: { transportPlanId: EntityId }) {
  const query = useTransportPlanAssignments(transportPlanId)
  if (query.isPending) return <Skeleton aria-label="Loading personnel" className="h-56 rounded-[2px] bg-[#e9e6de]" />
  if (query.isError) {
    const error = getTransportPlanError(query.error, "personnel")
    return <ErrorState message={error.message} onRetry={error.retryable ? () => void query.refetch() : undefined} />
  }
  return query.data ? <PersonnelDetails assignments={query.data} /> : <EmptyState message="No personnel assignments are available." />
}
