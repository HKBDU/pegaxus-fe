import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { accountDetail } from "@/app/route-config"
import { PageHeader } from "@/shared/components/PageHeader"
import { Field } from "@/shared/components/Field"
import { LoadingState, ErrorState } from "@/shared/components/common"
import { Button } from "@/shared/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { useEmployee, useUpdateEmployment } from "../hooks/useAccounts"
import { employeeRoles, formatAccountLabel } from "../constants"
import { getAccountError } from "../services"
import type { EmployeeDetail } from "../types"

function EmploymentForm({ employee }: { employee: EmployeeDetail }) {
  const [role, setRole] = useState(employee.role)
  const [workingStatus, setWorkingStatus] = useState(employee.workingStatus)
  const mutation = useUpdateEmployment()
  const navigate = useNavigate()
  return (
    <form className="booking-panel grid gap-4 rounded-[2px] border bg-white p-5 sm:grid-cols-2" onSubmit={async (event) => {
      event.preventDefault()
      if (mutation.isPending) return
      try {
        await mutation.mutateAsync({ id: employee.employeeId, changes: { role, workingStatus } })
        toast.success("Employee employment information updated successfully.")
        navigate(accountDetail(employee.employeeId))
      } catch (error) { toast.error(getAccountError(error)) }
    }}>
      <Field label="Employee Code (read only)" value={employee.employeeCode} readOnly />
      <Field label="Employee" value={employee.fullName ?? "—"} readOnly />
      <div className="grid gap-1"><label htmlFor="employee-role" className="font-heading text-[11px] uppercase">Role</label><Select value={role} onValueChange={setRole} disabled={mutation.isPending}><SelectTrigger id="employee-role" className="h-8 w-full rounded-[2px] text-xs data-[size=default]:h-8"><SelectValue /></SelectTrigger><SelectContent>{employeeRoles.map((value) => <SelectItem key={value} value={value}>{formatAccountLabel(value)}</SelectItem>)}</SelectContent></Select></div>
      <div className="grid gap-1"><label htmlFor="employee-working-status" className="font-heading text-[11px] uppercase">Working Status</label><Select value={workingStatus} onValueChange={(value) => setWorkingStatus(value as "ACTIVE" | "INACTIVE")} disabled={mutation.isPending}><SelectTrigger id="employee-working-status" className="h-8 w-full rounded-[2px] text-xs data-[size=default]:h-8"><SelectValue /></SelectTrigger><SelectContent>{["ACTIVE", "INACTIVE"].map((value) => <SelectItem key={value} value={value}>{formatAccountLabel(value)}</SelectItem>)}</SelectContent></Select></div>
      <p className="text-xs text-slate-500 sm:col-span-2">Only role and working status can be updated here. Account status is separate from working status.</p>
      <div className="flex gap-2 sm:col-span-2"><Button type="submit" disabled={mutation.isPending} size="sm" className="h-8 rounded-[2px] text-xs">{mutation.isPending ? "Saving..." : "Save changes"}</Button><Button asChild variant="outline" size="sm" className="h-8 rounded-[2px] text-xs"><Link to={accountDetail(employee.employeeId)}>Cancel</Link></Button></div>
    </form>
  )
}

export default function EditUserAccountPage() {
  const { employeeId = "" } = useParams()
  const query = useEmployee(employeeId)
  return (
    <div className="booking-page-shell min-h-[70dvh] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10"><div className="booking-page-enter mx-auto w-full max-w-[1152px]">
      <div className="mb-6"><PageHeader title="EDIT USER ACCOUNT" backHref={accountDetail(employeeId)} backLabel="BACK TO USER" /></div>
      {query.isPending ? <LoadingState /> : query.isError ? <ErrorState message={getAccountError(query.error)} onRetry={() => void query.refetch()} /> : query.data ? <EmploymentForm key={employeeId} employee={query.data} /> : null}
    </div></div>
  )
}
