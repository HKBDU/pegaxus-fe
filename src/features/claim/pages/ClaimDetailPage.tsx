import { useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { claimResolve, ROLE_ROUTES } from "@/app/route-config"
import { canAccess } from "@/features/auth/access-control"
import { useAuthStore } from "@/features/auth/store"
import { CancelClaimDialog } from "@/features/claim/components/CancelClaimDialog"
import { ClaimBillingPanel } from "@/features/claim/components/ClaimBillingPanel"
import { ClaimHandoverCard, ClaimInformationCard, ClaimOutcomeCard, ClaimSummaryStrip } from "@/features/claim/components/ClaimDetailSections"
import { ClaimProgress } from "@/features/claim/components/ClaimProgress"
import { CardTitle, dangerButtonClass, outlineButtonClass, panelClass, primaryButtonClass } from "@/features/claim/components/ClaimPrimitives"
import { openCreditNoteForm } from "@/features/claim/credit-note"
import { getClaimErrorMessage } from "@/features/claim/errors"
import { useClaim } from "@/features/claim/hooks"
import { cn } from "@/lib/utils"
import { ErrorState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"

/** screen §10B, view mode (Logistics Manager): read-only. Deciding the claim happens on the resolve page. */
export default function ClaimDetailPage() {
  const principal = useAuthStore((state) => state.principal)
  const { claimId = "" } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const allowed = canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })
  const query = useClaim(allowed ? claimId : undefined)
  const [cancelOpen, setCancelOpen] = useState(false)
  const claim = query.data
  // The list passes its query string along so "back" returns to the same filters.
  const listSearch = (location.state as { listSearch?: string } | null)?.listSearch ?? ""
  const backHref = `${ROLE_ROUTES.claims}${listSearch}`

  if (!allowed) return <ErrorState message="Only Logistics Managers can access claims." />

  const canProcess = claim?.availableActions.includes("RESOLVE") || claim?.availableActions.includes("COMPLETE")
  const canCreditNote = claim?.availableActions.includes("CREATE_CREDIT_NOTE")

  return (
    <div className="min-h-[70dvh] bg-[#f4f2ed] px-5 pt-5 pb-8 sm:px-6 lg:px-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1152px]">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <PageHeader title="CLAIM DETAILS" backHref={backHref} backLabel="BACK TO CLAIMS LIST" />
          {claim ? (
            <div className="flex w-full flex-row flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:pb-0.5">
              {claim.availableActions.includes("CANCEL") ? (
                <Button type="button" variant="outline" className={dangerButtonClass} onClick={() => setCancelOpen(true)}>Cancel claim</Button>
              ) : null}
              {canCreditNote ? (
                <Button type="button" variant="outline" className={outlineButtonClass} onClick={() => openCreditNoteForm(claim, navigate)}>Create credit note</Button>
              ) : null}
              {canProcess ? (
                <Button type="button" className={primaryButtonClass} onClick={() => navigate(claimResolve(claim.claimId), { state: { listSearch } })}>
                  {claim.availableActions.includes("RESOLVE") ? "Resolve claim" : "Complete claim"}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {query.isLoading ? <Skeleton className="h-64 w-full rounded-none bg-white" /> : null}
        {query.isError ? <ErrorState message={getClaimErrorMessage(query.error, "Unable to load this claim.")} onRetry={() => void query.refetch()} /> : null}

        {claim ? (
          <div className="booking-stagger space-y-2.5">
            <ClaimSummaryStrip claim={claim} />
            <section aria-label="Progress" className={cn(panelClass, "p-4")}>
              <CardTitle>Progress</CardTitle>
              <div className="mt-2.5"><ClaimProgress claim={claim} /></div>
            </section>
            <div className="grid items-stretch gap-2.5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <ClaimInformationCard claim={claim} />
              <ClaimHandoverCard claim={claim} />
            </div>
            {claim.billing ? <ClaimBillingPanel billing={claim.billing} /> : null}
            <ClaimOutcomeCard claim={claim} />
          </div>
        ) : null}
      </div>

      {claim ? <CancelClaimDialog claim={claim} open={cancelOpen} onOpenChange={setCancelOpen} onStale={() => void query.refetch()} /> : null}
    </div>
  )
}
