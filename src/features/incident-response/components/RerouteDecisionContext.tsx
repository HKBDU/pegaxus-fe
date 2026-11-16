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
  const backupAction = has("APPROVE_BACKUP") || has("REQUEST_BACKUP");
  return (
    <Section title="Next decision" className="border-t-2 border-t-primary">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="m-0 text-sm leading-5 text-slate-600">
            {manager
              ? "Compare the alternatives, then hold the convoy or open a route decision."
              : "Compare the alternatives. Escalate if none of them is suitable."}
          </p>
          {escalationAction}
        </div>
        <div className="divide-y divide-slate-200 border-t border-slate-200">
          <OptionBlock title="Hold & Wait">
            <p className="m-0 text-sm leading-5 text-slate-600">
              {context.hold?.status === "ACTIVE"
                ? "A hold is active. See Recorded hold."
                : manager && has("HOLD_ROUTE")
                  ? "Pause the convoy with monitoring instructions. The route does not change."
                  : "Only the Logistics Manager can record a hold."}
            </p>
            {holdAction}
          </OptionBlock>
          <OptionBlock
            title="Backup"
            badge={
              context.backupPlans.length ? (
                <Badge
                  variant="outline"
                  className={
                    "rounded-[2px] text-xs " +
                    (available
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-amber-900")
                  }
                >
                  {available}/{context.backupPlans.length} available
                </Badge>
              ) : undefined
            }
          >
            <p className="m-0 text-sm leading-5 text-slate-600">
              {!context.backupPlans.length
                ? "No backup plans provided."
                : backupAction
                  ? "Request or approve it from the backup route plan."
                  : "View only. No backup action is available now."}
            </p>
          </OptionBlock>
          <OptionBlock
            title="Return"
            badge={
              returnPlan ? (
                <Badge
                  variant="outline"
                  className={
                    "rounded-[2px] text-xs " +
                    (returnPlan.isAvailable
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-amber-900")
                  }
                >
                  {returnPlan.isAvailable ? "Available" : "Unavailable"}
                </Badge>
              ) : undefined
            }
          >
            {returnPlan ? (
              <>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">
                    {returnPlan.routePlanCode}
                  </span>
                  <Badge
                    variant="outline"
                    className="max-w-full whitespace-normal rounded-[2px] text-xs"
                  >
                    {returnPlan.status.replaceAll("_", " ")}
                  </Badge>
                </div>
                {returnPlan.unavailableReason && (
                  <p className="m-0 text-sm text-amber-900">
                    {returnPlan.unavailableReason.replaceAll("_", " ")}
                  </p>
                )}
                {real &&
                  rerouteIncidentIdSchema.safeParse(returnPlan.routePlanId)
                    .success && (
                    <Button
                      asChild
                      variant="outline"
                      className="min-h-11 w-full whitespace-normal rounded-[2px] text-sm sm:min-h-9"
                    >
                      <Link to={routePlanDetail(returnPlan.routePlanId)}>
                        Open return route plan
                      </Link>
                    </Button>
                  )}
                <p className="m-0 text-xs leading-5 text-slate-500">
                  Legal review and activation happen on the route plan.
                </p>
              </>
            ) : (
              <p className="m-0 text-sm text-slate-500">
                No return plan provided.
              </p>
            )}
          </OptionBlock>
        </div>
      </div>
    </Section>
  );
}

function OptionBlock({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2 py-3 last:pb-0">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h3 className="m-0! font-heading text-sm! uppercase tracking-wide text-slate-900">
          {title}
        </h3>
        {badge}
      </div>
      {children}
    </div>
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
            Activating the return needs both MAIN and EXTRA dossiers approved.
          </p>
        )}
        {context.returnPlan?.checks.some((check) => !check.passed) && (
          <div className="space-y-2 border-t border-slate-200 pt-3">
            <h3 className="m-0! font-heading text-sm! uppercase text-slate-700">
              Return feasibility checks
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
