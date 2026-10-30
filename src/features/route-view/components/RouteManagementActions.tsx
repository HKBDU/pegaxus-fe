import { useRef, useState } from "react";
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
import {
  ChangeVehiclesDialog,
  type ChangeVehiclesSnapshot,
} from "@/features/route-plan/components/ChangeVehiclesDialog";
import { getWorkspaceRole } from "@/features/transport-plan/workspace-role";
import { isFlow3MockMode } from "@/features/transport-plan/source";
import { Button } from "@/shared/components/ui/button";
import {
  refreshEmergencyQueries,
  captureVehicleChangeRefresh,
  type EmergencyContext,
} from "../hooks/useEmergencyRoute";
import type { RoutePlanDetail, RouteSegment } from "../types";
import { canChangeVehiclesBeforeDeparture } from "../vehicle-change";

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
  readOnly = false,
}: {
  plan: RoutePlanDetail;
  context: EmergencyContext;
  readOnly?: boolean;
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
  const vehicleRefresh = useRef<((result: unknown) => void) | null>(null);
  async function refresh(throwOnError = false) {
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
    } catch (error) {
      setRefreshFailed(true);
      if (throwOnError) throw error;
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
    role === "specialist" && plan.status === "DRAFT" && dossierReady && !readOnly;
  const canCancel = role === "coordinator" && plan.status === "DRAFT" && !readOnly;
  const canChangeVehicles = canChangeVehiclesBeforeDeparture(
    plan,
    context.workspace,
  );
  const changeableSegments = plan.segments.filter(
    (segment) =>
      !segment.isOutsourced &&
      segment.plannedDepartureAt &&
      segment.plannedArrivalAt &&
      ["ROAD", "SEA", "AIR"].includes(segment.route.transportMode),
  );
  const prepareVehicleRefresh = (snapshot: ChangeVehiclesSnapshot) => {
    if (
      readOnly || !canChangeVehicles ||
      mockMode ||
      !context.transportId ||
      snapshot.routePlan.routePlanId !== plan.routePlanId ||
      snapshot.routePlan.transportPlanId !== plan.transportPlanId
    )
      throw new Error("Reload the authorized route before changing vehicles.");
    vehicleRefresh.current = captureVehicleChangeRefresh(
      client,
      {
        ...snapshot.routePlan,
        bookingId: plan.bookingId,
        segments: snapshot.segments,
      },
      context,
      { genericInvalidationHandled: true },
      (message, kind) => toast[kind](message),
    );
  };
  const segments = legalSegments(review ?? plan);
  return (
    <>
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
          disabled={
            readOnly || mockMode || !context.transportId || changeableSegments.length === 0
          }
          title={
            mockMode
              ? "Vehicle changes require live route data."
              : changeableSegments.length === 0
                ? "No internal segments have verified planned times and transport mode."
                : undefined
          }
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
          segments={changeableSegments}
          onBeforeSubmit={prepareVehicleRefresh}
          onChanged={(result) => vehicleRefresh.current?.(result)}
          onReload={() => refresh(true)}
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

/**
 * Draft segments are staffed with a fleet vehicle or a provider by the Route Coordinator in the route builder
 * (the provider link is saved together with the plan), so the detail page only points there.
 */
export function RouteSegmentOutsourceAction({
  plan,
  context,
}: {
  plan: RoutePlanDetail;
  segment: RouteSegment;
  context: EmergencyContext;
}) {
  if (
    getWorkspaceRole(context.workspace.principal) !== "coordinator" ||
    plan.status !== "DRAFT"
  )
    return null;

  return (
    <Button asChild size="sm" variant="link" className="h-auto px-0 text-xs">
      <Link to={routePlanEdit(plan.routePlanId)}>
        Assign vehicle or provider in route builder
      </Link>
    </Button>
  );
}
