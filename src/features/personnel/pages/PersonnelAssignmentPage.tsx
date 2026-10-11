import { useParams } from "react-router-dom"

import { PersonnelAssignmentPanel } from "@/features/personnel/components/PersonnelAssignmentPanel"
import { PlanSummaryStrip } from "@/features/personnel/components/PersonnelUi"
import { useTransportPlanSummary } from "@/features/personnel/hooks"
import { PageHeader } from "@/shared/components/PageHeader"
import { ErrorState } from "@/shared/components/common"

/** SCR-F3-015 (UC-36): Phase 1 / Phase 2 personnel dashboard of one transport plan. Logistics Manager only. */
export default function PersonnelAssignmentPage() {
  const { transportPlanId } = useParams()
  if (!transportPlanId) return <ErrorState message="Transport plan not found." />
  return <PersonnelAssignmentContent transportPlanId={transportPlanId} />
}

function PersonnelAssignmentContent({ transportPlanId }: { transportPlanId: string }) {
  const planQuery = useTransportPlanSummary(transportPlanId)

  return (
    <div className="booking-page-shell min-h-[70dvh] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
      <div className="booking-page-enter mx-auto grid w-full max-w-[1280px] gap-5">
        <PageHeader title="PERSONNEL ASSIGNMENT" backHref="/admin/transport-plans" backLabel="RETURN TO TRANSPORT PLANS" />
        <p className="m-0 -mt-2 text-sm text-slate-500">Manage the Phase 1 and Phase 2 personnel assignments of this transport plan.</p>
        {planQuery.data ? <PlanSummaryStrip plan={planQuery.data} /> : null}
        <PersonnelAssignmentPanel transportPlanId={transportPlanId} />
      </div>
    </div>
  )
}
