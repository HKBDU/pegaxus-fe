import { useCallback, useState } from "react"
import { useDebounce } from "@/shared/hooks"

import { PageHeader } from "@/shared/components/PageHeader"
import { ErrorState } from "@/shared/components/common"
import { UserAccountsTable } from "../components/UserAccountsTable"
import { DeleteAccountDialog } from "../components/DeleteAccountDialog"
import { initialEmployeeParams } from "../constants"
import { useEmployees } from "../hooks/useAccounts"
import { getAccountError } from "../services"
import type { EmployeeAccount } from "../types"

export default function ManageUserAccountsPage() {
  const [params, setParams] = useState(initialEmployeeParams)
  const [deleteAccount, setDeleteAccount] = useState<EmployeeAccount | null>(null)
  const search = useDebounce(params.search, 300)
  const query = useEmployees({ ...params, search })
  const changeParams = useCallback((next: typeof params) => setParams(next), [])
  const meta = query.data?.meta ?? { currentPage: params.pageIndex, itemsPerPage: params.pageSize, totalItems: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false }

  return (
    <div className="booking-page-shell min-h-[70dvh] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1152px]">
        <div className="mb-6">
          <PageHeader title="MANAGE USER ACCOUNTS" backHref="/admin" showBack={false} />
          <p className="text-xs text-slate-500 sm:text-sm">Manage employee accounts, roles, account status and working status.</p>
        </div>
        {query.isError ? <ErrorState message={getAccountError(query.error)} onRetry={() => void query.refetch()} /> : null}
        <UserAccountsTable accounts={query.data?.data ?? []} params={params} meta={meta} isLoading={query.isFetching} onParamsChange={changeParams} onDelete={setDeleteAccount} />
      </div>
      <DeleteAccountDialog account={deleteAccount} onClose={() => setDeleteAccount(null)} onDeleted={() => setParams((current) => ({ ...current, pageIndex: 1 }))} />
    </div>
  )
}
