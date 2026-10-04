import { Download } from "lucide-react"
import { useCallback, useState } from "react"
import { toast } from "sonner"

import { DashboardKpiCards } from "@/features/dossier/components/DashboardKpiCards"
import { DashboardTable } from "@/features/dossier/components/DashboardTable"
import { ExportReportDialog } from "@/features/dossier/components/ExportReportDialog"
import { useDossierDashboard, useExportDashboard } from "@/features/dossier/hooks"
import type { DashboardParams } from "@/features/dossier/types"
import { getDossierErrorMessage } from "@/features/dossier/utils"
import { ErrorState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"

const initialParams: DashboardParams = {
  pageIndex: 1,
  pageSize: 8,
  search: "",
  status: "ALL",
  risk: "ALL",
  routeType: "ALL",
  sortBy: "requestedDepartureDate:asc",
}

/** SCR-F2-023: tracking dashboard of all ComplianceDossiers (TS and LM, UC-30). */
export default function DossierDashboardPage() {
  const [params, setParams] = useState(initialParams)
  const [exportOpen, setExportOpen] = useState(false)
  const dashboardQuery = useDossierDashboard(params)
  const exportReport = useExportDashboard()

  const handleSearchChange = useCallback((search: string) => {
    setParams((current) => (current.search === search ? current : { ...current, search, pageIndex: 1 }))
  }, [])

  const patchFilters = useCallback((patch: Partial<DashboardParams>) => {
    setParams((current) => ({ ...current, ...patch, pageIndex: 1 }))
  }, [])

  const handleExport = async (format: "xlsx" | "pdf") => {
    try {
      await exportReport.mutateAsync({ params, format })
      toast.success("Progress report downloaded.")
      setExportOpen(false)
    } catch (error) {
      toast.error(getDossierErrorMessage(error, "Unable to export the progress report"))
    }
  }

  const data = dashboardQuery.data

  return (
    <div className="booking-page-shell min-h-[70dvh] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1280px]">
        <div className="mb-6">
          <PageHeader
            title="COMPLIANCE DOSSIER TRACKING"
            showBack={false}
            backHref="/"
            action={
              <Button
                type="button"
                size="sm"
                className="h-9 shrink-0 rounded-[2px] bg-slate-900 px-4 font-heading text-xs font-semibold uppercase tracking-[0.05em] text-white hover:bg-slate-800"
                onClick={() => setExportOpen(true)}
              >
                <Download className="size-4" />
                Export report
              </Button>
            }
          />
          <p className="m-0 text-sm text-slate-500">Follow how complete each trip dossier is, and spot the trips that are about to depart without a full set of documents.</p>
        </div>

        <div className="mb-5">
          <DashboardKpiCards kpi={data?.kpi} isLoading={dashboardQuery.isLoading} />
        </div>

        {dashboardQuery.isLoading && !data ? <Skeleton className="h-96 rounded-none bg-[#e9e6de]" /> : null}
        {dashboardQuery.isError ? <ErrorState message={getDossierErrorMessage(dashboardQuery.error, "Unable to load the dossier dashboard.")} onRetry={() => void dashboardQuery.refetch()} /> : null}
        {data ? (
          <DashboardTable
            items={data.data}
            filters={params}
            meta={data.meta}
            onSearchChange={handleSearchChange}
            onRouteChange={(routeType) => patchFilters({ routeType })}
            onStatusChange={(status) => patchFilters({ status })}
            onRiskChange={(risk) => patchFilters({ risk })}
            onSortChange={(sortBy) => patchFilters({ sortBy })}
            onReset={() => setParams(initialParams)}
            onPageChange={(pageIndex) => setParams((current) => ({ ...current, pageIndex }))}
            onPageSizeChange={(pageSize) => setParams((current) => ({ ...current, pageSize, pageIndex: 1 }))}
          />
        ) : null}
      </div>

      <ExportReportDialog open={exportOpen} isPending={exportReport.isPending} onOpenChange={setExportOpen} onConfirm={(format) => void handleExport(format)} />
    </div>
  )
}
