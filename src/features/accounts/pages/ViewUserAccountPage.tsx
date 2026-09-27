import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Pencil, Trash2 } from "lucide-react"
import { ROLE_ROUTES, accountEdit } from "@/app/route-config"
import { formatBookingDate } from "@/features/booking/utils"
import { PageHeader } from "@/shared/components/PageHeader"
import { Field } from "@/shared/components/Field"
import { LoadingState, ErrorState } from "@/shared/components/common"
import { Button } from "@/shared/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/shared/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { useEmployee } from "../hooks/useAccounts"
import { getAccountError } from "../services"
import { formatAccountLabel } from "../constants"
import { DeleteAccountDialog } from "../components/DeleteAccountDialog"

export default function ViewUserAccountPage() {
  const { employeeId = "" } = useParams()
  const query = useEmployee(employeeId)
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const employee = query.data
  const date = (value: string | null, time = true) => value ? formatBookingDate(value, time) : "—"
  return (
    <div className="booking-page-shell min-h-[70dvh] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1152px]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div><PageHeader title="VIEW USER ACCOUNT" backHref={ROLE_ROUTES.managerUsers} showBack={false} /><p className="text-xs text-slate-500">Read-only employee account information.</p></div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="h-8 rounded-[2px] bg-white text-xs"><Link to={ROLE_ROUTES.managerUsers}><ArrowLeft className="size-3.5" />Back to List</Link></Button>
            {employee ? <>
              <Button asChild variant="outline" size="sm" className="h-8 rounded-[2px] bg-white text-xs"><Link to={accountEdit(employee.employeeId)}><Pencil className="size-3.5" />Edit</Link></Button>
              <Button variant="outline" size="sm" className="h-8 rounded-[2px] border-red-300 bg-white text-xs text-red-600" onClick={() => setDeleting(true)}><Trash2 className="size-3.5" />Delete</Button>
            </> : null}
          </div>
        </div>
        {query.isPending ? <LoadingState /> : query.isError ? <ErrorState message={getAccountError(query.error)} onRetry={() => void query.refetch()} /> : employee ? (
          <div className="space-y-3">
            <Card className="booking-panel rounded-[2px] border bg-white shadow-none"><CardContent className="flex flex-wrap items-center gap-4 py-5">
              <Avatar className="size-16 border border-slate-200"><AvatarImage src={employee.avatarUrl ?? undefined} alt={employee.fullName ?? "Employee avatar"} /><AvatarFallback>{(employee.fullName ?? "?").split(" ").map((part) => part[0]).slice(0, 2).join("")}</AvatarFallback></Avatar>
              <div><p className="text-lg font-semibold text-slate-900">{employee.fullName ?? "—"}</p><p className="text-xs text-slate-500">{employee.employeeCode} · {formatAccountLabel(employee.role)}</p><p className="mt-1 text-xs text-slate-500">Account: {formatAccountLabel(employee.accountStatus)} · Working: {formatAccountLabel(employee.workingStatus)}</p></div>
            </CardContent></Card>
            {[
              { title: "PERSONAL INFORMATION", fields: [["Full Name", employee.fullName], ["Email", employee.email], ["Phone", employee.phone], ["Date of Birth", date(employee.dateOfBirth, false)]] },
              { title: "EMPLOYMENT / ACCOUNT INFORMATION", fields: [["Employee Code", employee.employeeCode], ["Employee ID", String(employee.employeeId)], ["Account ID", String(employee.accountId)], ["Role", formatAccountLabel(employee.role)], ["Working Status", formatAccountLabel(employee.workingStatus)], ["Account Status", formatAccountLabel(employee.accountStatus)]] },
              { title: "ACCOUNT TIMELINE (UTC)", fields: [["Last Login At", date(employee.lastLoginAt)], ["Created At", date(employee.createdAt)], ["Updated At", date(employee.updatedAt)]] },
            ].map(({ title, fields }) => (
              <Card key={title} className="booking-panel rounded-[2px] border bg-white shadow-none">
                <CardHeader className="px-5 py-4"><CardTitle className="font-heading text-sm text-slate-900">{title}</CardTitle></CardHeader>
                <CardContent className="grid gap-4 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">{fields.map(([label, value]) => <Field key={label} label={label!} value={value ?? "—"} />)}</CardContent>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
      <DeleteAccountDialog account={deleting && employee ? employee : null} onClose={() => setDeleting(false)} onDeleted={() => navigate(ROLE_ROUTES.managerUsers, { replace: true })} />
    </div>
  )
}
