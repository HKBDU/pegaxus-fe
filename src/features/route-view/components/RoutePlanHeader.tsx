import { useState } from "react"
import { Download } from "lucide-react"
import { toast } from "sonner"
import { transportPlanDetail } from "@/app/route-config"
import { PageHeader } from "@/shared/components/PageHeader"
import { Button } from "@/shared/components/ui/button"
import { useAuthStore } from "@/features/auth/store"
import { useRequestAttemptGuard } from "@/shared/hooks/useRequestAttemptGuard"
import { ApprovedBookingBadge } from "@/features/transport-plan/components/ApprovedBookingBadge"
import { isFlow3MockMode } from "@/features/transport-plan/source"
import { canExportRoute, getRouteViewError, routeViewService } from "../services"
import { downloadRoutePdf } from "../download"
import type { RoutePlanDetail } from "../types"

export function RoutePlanHeader({ plan }: { plan: RoutePlanDetail }) {
  const principal = useAuthStore((state) => state.principal)
  const attempt = useRequestAttemptGuard()
  const [error, setError] = useState("")
  const mockMode = !import.meta.env.PROD && isFlow3MockMode()
  async function exportPdf() {
    setError("")
    try {
      const result = await attempt.run(() => routeViewService.exportPdf(plan.routePlanId))
      if (!result.started) return
      downloadRoutePdf(result.value, plan.routePlanCode)
      toast.success("Route PDF downloaded.")
    } catch (problem) { setError(getRouteViewError(problem).message) }
  }
  return <header className="space-y-3 border-b border-slate-200 pb-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><PageHeader title="Route Plan Details" backHref={transportPlanDetail(plan.transportPlanId)} backLabel="Back to Transport Plan" />
        <div className="mt-2 flex flex-wrap items-center gap-2"><h2 className="font-heading text-xl">{plan.routePlanCode}</h2><ApprovedBookingBadge value={plan.routeType} /><ApprovedBookingBadge value={plan.status} /></div>
        <p className="mt-2 text-xs text-slate-500">Booking: {plan.bookingCode} · {plan.isCrossBorder ? "Cross-border" : "Domestic"}</p>
      </div>
      {canExportRoute(principal) && <div className="space-y-1"><Button variant="outline" className="bg-white" disabled={mockMode || attempt.isRunning || attempt.isBlocked} onClick={() => void exportPdf()}>
        <Download className="size-4" />{attempt.isRunning ? "Exporting..." : "Export PDF"}
      </Button>{mockMode && <p className="max-w-52 text-xs text-slate-500">PDF export is unavailable in mock mode.</p>}</div>}
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </header>
}
