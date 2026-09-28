import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useDebounce } from "@/shared/hooks";

import { ROLE_ROUTES } from "@/app/route-config";
import { PageHeader } from "@/shared/components/PageHeader";
import { ErrorState } from "@/shared/components/common";
import { Button } from "@/shared/components/ui/button";
import { UserAccountsTable } from "../components/UserAccountsTable";
import { DeleteAccountDialog } from "../components/DeleteAccountDialog";
import { initialEmployeeParams } from "../constants";
import { useEmployees } from "../hooks/useAccounts";
import { getAccountError } from "../services";
import type { EmployeeAccount } from "../types";

export default function ManageUserAccountsPage() {
  const [params, setParams] = useState(initialEmployeeParams);
  const [deleteAccount, setDeleteAccount] = useState<EmployeeAccount | null>(
    null,
  );
  const search = useDebounce(params.search, 300);
  const query = useEmployees({ ...params, search });
  const changeParams = useCallback(
    (next: typeof params) => setParams(next),
    [],
  );
  const meta = query.data?.meta ?? {
    currentPage: params.pageIndex,
    itemsPerPage: params.pageSize,
    totalItems: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  };

  return (
    <div className="booking-page-shell min-h-[calc(100svh-3rem)] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1152px]">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <PageHeader
              title="MANAGE EMPLOYEE ACCOUNTS"
              backHref="/admin"
              showBack={false}
            />
            <p className="text-xs text-slate-500 sm:text-sm">
              Manage employee accounts, roles, account status and working
              status.
            </p>
          </div>
          <Button
            asChild
            size="sm"
            className="h-8 shrink-0 rounded-[2px] font-heading text-[11px] uppercase xl:hidden"
          >
            <Link to={ROLE_ROUTES.managerCreateUser}>
              <Plus className="size-3.5" /> Create
            </Link>
          </Button>
        </div>
        {query.isError ? (
          <ErrorState
            message={getAccountError(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : null}
        {query.data || !query.isError ? (
          <UserAccountsTable
            accounts={query.data?.data ?? []}
            params={params}
            meta={meta}
            isLoading={query.isFetching}
            onParamsChange={changeParams}
            onDelete={setDeleteAccount}
          />
        ) : null}
      </div>
      <DeleteAccountDialog
        account={deleteAccount}
        onClose={() => setDeleteAccount(null)}
        onDeleted={() => setParams((current) => ({ ...current, pageIndex: 1 }))}
      />
    </div>
  );
}
