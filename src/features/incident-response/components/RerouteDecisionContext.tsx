import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { routePlanDetail } from "@/app/route-config";
import {
  Section,
  Field,
} from "@/features/transport-plan/components/ApprovedBookingDetails";
import { formatPlanDate } from "@/features/transport-plan/format";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  rerouteIncidentIdSchema,
  type RerouteContext,
} from "../reroute-schemas";
import { isEmergencyCostMockMode } from "../source";
import { RerouteChecks } from "./RerouteComparison";

export function RerouteDecisionOptions({
  context,
  manager,
  holdAction,
  escalationAction,
}: {
  context: RerouteContext;
  manager: boolean;
  holdAction: ReactNode;
  escalationAction: ReactNode;
}) {
  const has = (action: string) => context.availableActions.includes(action);
  const available = context.backupPlans.filter(
    (plan) => plan.isAvailable,
  ).length;
  const returnPlan = context.returnPlan;
  const real = !isEmergencyCostMockMode();
  return (
    <Section title="Next decision" className="border-t-2 border-t-primary">
      <p className="m-0 text-sm leading-5 text-slate-600">
        {manager
          ? "Review the alternatives before recording a wait or opening a route decision."
          : "Review route feasibility before escalating unsuitable alternatives."}
      </p>
      <div
        className={
          !manager && has("ESCALATE_REROUTE")
            ? "space-y-2 border-b border-slate-200 pb-3"
            : ""
        }
      >
        {!manager && has("ESCALATE_REROUTE") && (
          <p className="m-0 text-sm leading-5 text-slate-600">
            Report why the current routing alternatives are unsuitable.
          </p>
        )}
        {escalationAction}
      </div>
      <div className="divide-y divide-slate-200">
        <div className="space-y-2 pb-3">
          <h3 className="m-0! font-heading text-base! uppercase text-slate-900">
            Hold &amp; Wait
          </h3>
          <p className="m-0 text-sm leading-5 text-slate-700">
            {context.hold?.status === "ACTIVE"
              ? "A hold is already active. Review the recorded decision below."
              : manager && has("HOLD_ROUTE")
                ? "Set a temporary wait and monitoring instructions. This does not activate another route."
                : "A new hold can only be recorded by Logistics Management when authorized."}
          </p>
          {holdAction}
        </div>
        <div className="space-y-1.5 py-3">
          <h3 className="m-0! font-heading text-base! uppercase text-slate-900">
            BACKUP
          </h3>
          <p className="m-0 text-sm text-slate-700">
            {context.backupPlans.length
              ? available +
                " of " +
                context.backupPlans.length +
                " alternatives available for review."
              : "No BACKUP alternatives provided."}
          </p>
          <p className="m-0 text-xs leading-5 text-slate-500">
            {has("APPROVE_BACKUP") || has("REQUEST_BACKUP")
              ? "Review the checks in Route assessment. Proposals and approvals stay in RoutePlan Details."
              : "Route assessment is read-only here; no BACKUP decision is currently available."}
          </p>
        </div>
        <div className="space-y-2 pt-3">
          <h3 className="m-0! font-heading text-base! uppercase text-slate-900">
            RETURN
          </h3>
          {returnPlan ? (
            <>
              <p className="m-0 text-sm font-medium text-slate-800 [overflow-wrap:anywhere]">
                {returnPlan.routePlanCode}
              </p>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">Plan status</span>
                <Badge
                  variant="outline"
                  className="max-w-full whitespace-normal rounded-[2px] text-xs"
                >
                  {returnPlan.status.replaceAll("_", " ")}
                </Badge>
              </div>
              <p
                className={
                  "m-0 text-sm " +
                  (returnPlan.isAvailable ? "text-slate-700" : "text-amber-900")
                }
              >
                {returnPlan.isAvailable ? "Available" : "Unavailable"}
                {returnPlan.unavailableReason
                  ? " · " + returnPlan.unavailableReason.replaceAll("_", " ")
                  : ""}
              </p>
              {real &&
                rerouteIncidentIdSchema.safeParse(returnPlan.routePlanId)
                  .success && (
                  <Button
                    asChild
                    variant="outline"
                    className="min-h-11 w-full whitespace-normal rounded-[2px] text-sm sm:min-h-9"
                  >
                    <Link to={routePlanDetail(returnPlan.routePlanId)}>
                      View RETURN RoutePlan
                    </Link>
                  </Button>
                )}
              <p className="m-0 text-xs leading-5 text-slate-500">
                Legal review and activation remain separate RoutePlan
                operations.
              </p>
            </>
          ) : (
            <p className="m-0 text-sm text-slate-500">
              No RETURN plan provided.
            </p>
          )}
        </div>
      </div>
    </Section>
  );
}

export function RerouteDecisionContext({
  context,
}: {
  context: RerouteContext;
}) {
  const legalReady = ["MAIN", "EXTRA"].every((type) =>
    context.complianceDossiers.some(
      (dossier) =>
        dossier.dossierType === type && dossier.status === "APPROVED",
    ),
  );
  return (
    <Section title="Decision prerequisites">
      <div className="space-y-3">
        <dl className="m-0 space-y-3">
          {["MAIN", "EXTRA"].map((type) => {
            const dossiers = context.complianceDossiers.filter(
              (dossier) => dossier.dossierType === type,
            );
            return (
              <div
                key={type}
                className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] items-start gap-2"
              >
                <dt className="text-sm font-medium text-slate-800">{type}</dt>
                <dd className="m-0 min-w-0 space-y-2 text-sm text-slate-600">
                  {dossiers.length
                    ? dossiers.map((dossier) => (
                        <div
                          key={dossier.complianceDossierId}
                          className="flex min-w-0 flex-wrap items-center gap-1.5"
                        >
                          <span className="[overflow-wrap:anywhere]">
                            {dossier.dossierCode}
                          </span>
                          <Badge
                            variant="outline"
                            className="max-w-full whitespace-normal rounded-[2px] text-xs"
                          >
                            {dossier.status.replaceAll("_", " ")}
                          </Badge>
                        </div>
                      ))
                    : "Not provided"}
                </dd>
              </div>
            );
          })}
        </dl>
        {context.returnPlan && !legalReady && (
          <p className="m-0 border-l-2 border-amber-400 pl-3 text-sm leading-5 text-amber-900">
            RETURN activation requires approved MAIN and EXTRA dossiers. MAIN
            must be preserved.
          </p>
        )}
        {context.returnPlan && (
          <div className="space-y-2 border-t border-slate-200 pt-3">
            <h3 className="m-0! font-heading text-sm! uppercase text-slate-700">
              RETURN feasibility checks
            </h3>
            <RerouteChecks checks={context.returnPlan.checks} />
          </div>
        )}
        {context.hold && (
          <div
            className={
              "space-y-3 border-t border-slate-200 pt-3 " +
              (context.hold.status === "ACTIVE"
                ? "border-l-2 border-l-primary pl-3"
                : "")
            }
          >
            <h3 className="m-0! flex flex-wrap items-center gap-2 font-heading text-base! uppercase text-slate-900">
              Recorded hold
              <Badge variant="outline" className="rounded-[2px] text-xs">
                {context.hold.status}
              </Badge>
            </h3>
            <dl className="m-0 grid gap-3 sm:grid-cols-2 [&_dt]:text-xs">
              <Field label="Hold until">
                <time dateTime={context.hold.holdUntil}>
                  {formatPlanDate(context.hold.holdUntil)}
                </time>
              </Field>
              <Field label="Started">
                {formatPlanDate(context.hold.startedAt)}
              </Field>
              <Field label="Duration">{context.hold.holdMinutes} min</Field>
              <Field label="Monitoring interval">
                {context.hold.monitorIntervalMinutes} min
              </Field>
              {context.hold.safeStopLocation && (
                <Field label="Safe stop">
                  {context.hold.safeStopLocation.locationName}
                </Field>
              )}
              <Field label="Decided by">
                {context.hold.decidedBy.fullName}
              </Field>
            </dl>
            <p className="m-0 whitespace-pre-wrap text-sm leading-5 text-slate-700 [overflow-wrap:anywhere]">
              {context.hold.reason}
            </p>
          </div>
        )}
      </div>
    </Section>
  );
}
