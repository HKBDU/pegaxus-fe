import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FileText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { dossierDetail, ROLE_ROUTES, routePlanEdit } from "@/app/route-config";
import {
  LegalFeasibilityPanel,
  type LegalFeasibilityPanelProps,
} from "@/features/route-plan/components/LegalFeasibilityPanel";
import { CancelRoutePlanDialog } from "@/features/route-plan/components/CancelRoutePlanDialog";
import { ChangeVehiclesDialog } from "@/features/route-plan/components/ChangeVehiclesDialog";
import { OutsourceSegmentDialog } from "@/features/route-plan/components/OutsourceSegmentDialog";
import { getWorkspaceRole } from "@/features/transport-plan/workspace-role";
import { isFlow3MockMode } from "@/features/transport-plan/source";
import { getRoutePlanError, updateSegmentOutsourcing } from "@/features/route-plan/services";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  refreshEmergencyQueries,
  type EmergencyContext,
} from "../hooks/useEmergencyRoute";
import type { RoutePlanDetail, RouteSegment } from "../types";
import { canChangeVehiclesBeforeDeparture, vehicleChangeDialogBlocker } from "../vehicle-change";

const legalActionClass =
  "min-h-11 gap-1.5 rounded-[2px] border px-3 font-heading text-[11px] font-semibold uppercase tracking-[0.05em] transition-colors duration-200 focus-visible:ring-primary/30 motion-reduce:transition-none sm:min-h-8";

// The provider currently requires measured numeric fields even though it only displays routeName.
// Do not turn absent measurements into zero to satisfy that public interface.
function legalSegments(
  plan: RoutePlanDetail,
): LegalFeasibilityPanelProps["segments"] | null {
  const result: LegalFeasibilityPanelProps["segments"] = [];
  for (const segment of plan.segments) {
    const { distanceKm, estimatedDurationMinutes } = segment.route;
    if (distanceKm == null || estimatedDurationMinutes == null) return null;
    result.push({
      sequenceNo: segment.sequenceNo,
      route: {
        ...segment.route,
        routeName: segment.route.routeName ?? segment.route.routeCode,
        distanceKm,
        estimatedDurationMinutes,
      },
    });
  }
  return result;
}

export function RouteManagementActions({
  plan,
  context,
}: {
  plan: RoutePlanDetail;
  context: EmergencyContext;
}) {
  const client = useQueryClient();
  const role = getWorkspaceRole(context.workspace.principal);
  const mockMode = isFlow3MockMode();
  const legalDossier = context.legalDossier;
  const canViewDossier = role === "specialist" || role === "manager";
  const [review, setReview] = useState<RoutePlanDetail | null>(null);
  const [cancelVersion, setCancelVersion] = useState(plan.updatedAt);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [changeVehiclesOpen, setChangeVehiclesOpen] = useState(false);
  async function refresh() {
    setRefreshing(true);
    setRefreshFailed(false);
    try {
      await refreshEmergencyQueries(
        client,
        plan,
        "management",
        legalDossier?.complianceDossierId,
        [],
        context.transportId,
      );
    } catch {
      setRefreshFailed(true);
    } finally {
      setRefreshing(false);
    }
  }
  const dossierReady =
    plan.routeType === "BACKUP" ||
    (legalDossier?.status === "DRAFT" &&
      (plan.routeType !== "RETURN" ||
        context.workspace.transportStatus === "IN_TRANSIT"));
  const canReview =
    role === "specialist" && plan.status === "DRAFT" && dossierReady;
  const canCancel = role === "coordinator" && plan.status === "DRAFT";
  const canChangeVehicles =
    role === "coordinator" &&
    plan.routeType === "PRIMARY" &&
    plan.status === "CONFIRMED";
  const segments = legalSegments(review ?? plan);
  return (
    <>
      {canChangeVehiclesBeforeDeparture(plan, context.workspace) && (
        <span className="inline-flex max-w-full flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" className={legalActionClass} disabled title={vehicleChangeDialogBlocker} aria-describedby={`vehicle-change-blocker-${plan.routePlanId}`}>Change Vehicles</Button>
          <span id={`vehicle-change-blocker-${plan.routePlanId}`} className="max-w-64 text-xs text-muted-foreground">{vehicleChangeDialogBlocker}</span>
        </span>
      )}
      {canViewDossier && legalDossier ? (
        <>
          <span className="text-xs text-slate-600">
            {legalDossier.dossierType ?? "Linked"} dossier:{" "}
            {legalDossier.status}
          </span>
          <Button
            asChild
            size="sm"
            variant="outline"
            className={`${legalActionClass} border-border bg-background text-foreground shadow-none hover:border-primary/50 hover:bg-primary/5 hover:text-foreground`}
          >
            <Link
              to={dossierDetail(
                legalDossier.complianceDossierId,
                role === "specialist"
                  ? "TRANSPORT_SPECIALIST"
                  : "LOGISTICS_MANAGER",
              )}
            >
              <FileText aria-hidden="true" className="size-3.5" />
              View Compliance Dossier
            </Link>
          </Button>
        </>
      ) : null}
      {role === "specialist" && plan.status === "DRAFT" && !dossierReady ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-slate-600">
          <span>
            {plan.routeType === "RETURN"
              ? "Legal review requires LM approval, an EXTRA dossier in DRAFT and an IN_TRANSIT transport."
              : "Legal review requires the linked MAIN dossier to be in DRAFT."}
          </span>
          {plan.routeType === "PRIMARY" &&
          !legalDossier &&
          context.workspace.planStatus === "APPROVED" ? (
            <Button asChild size="sm" variant="outline">
              <Link
                to={`${ROLE_ROUTES.complianceDossiers}/new/${encodeURIComponent(plan.bookingId)}`}
              >
                Apply Dossier Template
              </Link>
            </Button>
          ) : null}
        </div>
      ) : null}
      {canReview ? (
        <Button
          type="button"
          size="sm"
          className={`${legalActionClass} border-transparent shadow-xs`}
          disabled={mockMode || refreshing || !segments?.length}
          onClick={() => setReview(plan)}
          title={
            !segments?.length
              ? "Legal review requires complete measured route data for the existing panel."
              : undefined
          }
        >
          <ShieldCheck aria-hidden="true" className="size-3.5" />
          Review Legal Feasibility
        </Button>
      ) : null}
      {canCancel ? (
        <Button asChild size="sm" variant="outline">
          <Link to={routePlanEdit(plan.routePlanId)}>Edit</Link>
        </Button>
      ) : null}
      {canChangeVehicles ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setChangeVehiclesOpen(true)}
        >
          Change vehicles
        </Button>
      ) : null}
      {canCancel && plan.routeType !== "RETURN" ? (
        <CancelRoutePlanDialog
          routePlanId={plan.routePlanId}
          status="DRAFT"
          lastUpdatedAt={cancelVersion}
          routePlanCode={plan.routePlanCode}
          onCancelled={() => void refresh()}
        >
          <Button
            size="sm"
            variant="outline"
            disabled={mockMode || refreshing}
            onClick={() => setCancelVersion(plan.updatedAt)}
          >
            Cancel Draft Route
          </Button>
        </CancelRoutePlanDialog>
      ) : null}
      {canCancel && plan.routeType === "RETURN" ? (
        <span className="text-xs text-slate-500">
          RETURN cancellation is unavailable until its approval state can be
          verified.
        </span>
      ) : null}
      {refreshFailed ? (
        <p role="alert" className="text-xs text-destructive">
          The action may have succeeded, but refresh failed. Refresh this page
          before another action.
        </p>
      ) : null}
      {mockMode && (canReview || canCancel) ? (
        <p className="text-xs text-slate-500">
          Legal/Cancel providers use real APIs. Their mutations are disabled in
          Flow 3 mock mode.
        </p>
      ) : null}
      {canChangeVehicles ? (
        <ChangeVehiclesDialog
          open={changeVehiclesOpen}
          onOpenChange={setChangeVehiclesOpen}
          mode="before-departure"
          routePlan={plan}
          segments={plan.segments}
          onChanged={() => {
            setChangeVehiclesOpen(false);
            void refresh();
          }}
          onReload={() => void refresh()}
        />
      ) : null}
      {review && segments && canReview && !mockMode ? (
        <LegalFeasibilityPanel
          routePlanId={review.routePlanId}
          lastUpdatedAt={review.updatedAt}
          segments={segments}
          legalReview={
            review.legalReview
              ? {
                  ...review.legalReview,
                  note: review.legalReview.note ?? null,
                  blockedSegments: review.legalReview.blockedSegments ?? [],
                  reviewedAt: review.legalReview.reviewedAt ?? null,
                  reviewedBy: review.legalReview.reviewedBy
                    ? {
                        ...review.legalReview.reviewedBy,
                        employeeCode:
                          review.legalReview.reviewedBy.employeeCode ?? "",
                      }
                    : null,
                }
              : null
          }
          open
          onOpenChange={(open) => {
            if (!open) setReview(null);
          }}
          onConfirmed={() => {
            setReview(null);
            void refresh();
          }}
        />
      ) : null}
    </>
  );
}

export function RouteSegmentOutsourceAction({
  plan,
  segment,
  context,
}: {
  plan: RoutePlanDetail;
  segment: RouteSegment;
  context: EmergencyContext;
}) {
  const client = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [savingInternal, setSavingInternal] = useState(false);
  if (
    getWorkspaceRole(context.workspace.principal) !== "manager" ||
    plan.status !== "DRAFT"
  )
    return null;
  async function switchToInternal() {
    setSavingInternal(true);
    try {
      await updateSegmentOutsourcing(plan.routePlanId, segment.routePlanRouteId, {
        lastUpdatedAt: plan.updatedAt,
        outsourced: false,
      });
      await refreshEmergencyQueries(client, plan, "management", context.dossierId);
      toast.success("Segment switched to internal fleet.");
    } catch (requestError) {
      toast.error(getRoutePlanError(requestError).message);
    } finally {
      setSavingInternal(false);
    }
  }

  return (
    <div className="max-w-72 space-y-1 text-right">
      <Select
        value={segment.isOutsourced ? "OUTSOURCED" : "INTERNAL"}
        disabled={savingInternal}
        onValueChange={(value) => {
          if (value === "OUTSOURCED") setDialogOpen(true);
          else void switchToInternal();
        }}
      >
        <SelectTrigger className="h-9 w-full rounded border bg-background text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="INTERNAL">Internal</SelectItem>
          <SelectItem value="OUTSOURCED">Outsource</SelectItem>
        </SelectContent>
      </Select>
      <OutsourceSegmentDialog
        routePlanId={plan.routePlanId}
        routePlanRouteId={segment.routePlanRouteId}
        lastUpdatedAt={plan.updatedAt}
        transportMode={segment.route.transportMode}
        isOutsourced={segment.isOutsourced}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentNote={segment.note}
        onChanged={() =>
          void refreshEmergencyQueries(
            client,
            plan,
            "management",
            context.dossierId,
          )
        }
      >
        <span className="sr-only">Configure outsourced segment</span>
      </OutsourceSegmentDialog>
      {!segment.isOutsourced ? (
        <Button asChild size="sm" variant="link" className="h-auto px-0 text-xs">
          <Link to={routePlanEdit(plan.routePlanId)}>
            Assign vehicle in route builder
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
