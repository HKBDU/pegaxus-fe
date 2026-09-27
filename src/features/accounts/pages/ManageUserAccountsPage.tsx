import { useMemo, useState } from "react"
import { ChevronRight, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/shared/components/PageHeader"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle } from "@/shared/components/ui/alert-dialog"
import { UserAccountsTable } from "../components/UserAccountsTable"
import { UserAccountFilters } from "../components/UserAccountFilters"
import { defaultAccountFilters, demoAccounts, filterAccounts, type AccountFilters, type UserAccountRow } from "../mock-data"

export default function ManageUserAccountsPage() {
  const [accounts, setAccounts] = useState(demoAccounts)
  const [filters, setFilters] = useState(defaultAccountFilters)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 })
  const [deleteAccount, setDeleteAccount] = useState<UserAccountRow | null>(null)
  const filteredAccounts = useMemo(() => filterAccounts(accounts, filters), [accounts, filters])

  const changeFilters = (next: AccountFilters) => {
    setFilters(next)
    setPagination((current) => ({ ...current, pageIndex: 0 }))
  }

  const confirmDelete = () => {
    if (!deleteAccount) return
    setAccounts((current) => current.filter((account) => account.id !== deleteAccount.id))
    const remainingCount = filteredAccounts.length - 1
    setPagination((current) => ({ ...current, pageIndex: Math.min(current.pageIndex, Math.max(0, Math.ceil(remainingCount / current.pageSize) - 1)) }))
    setDeleteAccount(null)
    toast.success("Account removed from this demo list only. No backend changes are saved.")
  }

  return (
    <div className="booking-page-shell min-h-[70dvh] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1152px]">
        <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-2 text-xs text-slate-500"><span>Users</span><ChevronRight aria-hidden="true" className="size-3" /><span aria-current="page">Manage User Accounts</span></nav>
        <div className="mb-6">
          <PageHeader title="MANAGE USER ACCOUNTS" backHref="/admin" showBack={false} />
          <p className="text-xs text-slate-500 sm:text-sm">Logistics Managers and authorized Employees can manage user details, account status and permissions.</p>
          <p className="mt-2 text-xs text-slate-500">UI preview with demo data. Changes are not saved to the server.</p>
        </div>
        <UserAccountsTable accounts={filteredAccounts} pagination={pagination} onPaginationChange={setPagination} onDelete={setDeleteAccount}>
          <UserAccountFilters filters={filters} onChange={changeFilters} onReset={() => changeFilters(defaultAccountFilters)} />
        </UserAccountsTable>
      </div>
      <AlertDialog open={Boolean(deleteAccount)} onOpenChange={(open) => !open && setDeleteAccount(null)}>
        <AlertDialogContent className="gap-3 rounded-[2px] border-slate-200 bg-white p-4 text-slate-900 shadow-[0_14px_35px_rgba(15,23,42,0.16)] data-[size=default]:sm:max-w-[390px]">
          <AlertDialogHeader className="grid grid-rows-none grid-cols-[28px_minmax(0,1fr)] place-items-start gap-2.5 text-left">
            <AlertDialogMedia className="m-0 grid size-7 shrink-0 place-items-center rounded-[2px] bg-red-50 text-red-600"><TriangleAlert className="size-3.5" /></AlertDialogMedia>
            <div className="grid gap-0.5">
              <AlertDialogTitle className="m-0! font-heading text-base! leading-5! font-semibold! tracking-normal! text-slate-900">Delete this account?</AlertDialogTitle>
              <AlertDialogDescription className="text-xs leading-4 text-slate-600">Remove {deleteAccount?.fullName} from this demo list? This does not delete the account on the server. Backend deletion semantics will be integrated later.</AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-1.5">
            <AlertDialogCancel size="sm" className="h-8 rounded-[2px] border-slate-300 bg-white px-3 text-xs font-normal text-slate-700 shadow-none">Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" size="sm" onClick={confirmDelete} className="h-8 rounded-[2px] bg-red-600 px-3 text-xs font-normal text-white shadow-none hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
