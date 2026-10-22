import {
  Section,
  Field,
} from "@/features/transport-plan/components/ApprovedBookingDetails";
import { formatPlanDate } from "@/features/transport-plan/format";
import type { RerouteContext } from "../reroute-schemas";
import type { ReactNode } from "react";

const actionLabels: Record<string, string> = {
  REQUEST_BACKUP: "Request BACKUP review",
  APPROVE_BACKUP: "Review BACKUP approval",
  ESCALATE_REROUTE: "Escalate blocked routes",
  HOLD_ROUTE: "Decide Hold & Wait",
  CREATE_RETURN: "Prepare RETURN plan",
  ACTIVATE_RETURN: "Activate approved RETURN",
};

export function RerouteDecisionOptions({
  context,
  children,
}: {
  context: RerouteContext;
  children?: ReactNode;
}) {
  const has = (action: string) => context.availableActions.includes(action);
  const options = [
    {
      title: "BACKUP",
      text: has("APPROVE_BACKUP")
        ? "Server permits approval review."
        : has("REQUEST_BACKUP")
          ? "Server permits a coordinator proposal."
          : "No BACKUP decision capability is supplied.",
      detail: `${context.backupPlans.filter((plan) => plan.isAvailable).length} of ${context.backupPlans.length} plans available.`,
    },
    {
      title: "HOLD & WAIT",
      text: has("HOLD_ROUTE")
        ? "Server permits a hold decision."
        : "No new hold capability is supplied.",
      detail: context.hold
        ? `${context.hold.status === "ACTIVE" ? "Active" : "Expired"} hold · details below.`
        : "No hold is recorded for this incident.",
    },
    {
      title: "RETURN",
      text: has("ACTIVATE_RETURN")
        ? "Server permits activation under its current prerequisites."
        : has("CREATE_RETURN")
          ? "Server permits preparation of a RETURN plan."
          : "No RETURN decision capability is supplied.",
      detail: context.returnPlan
        ? "Existing standardized plan · legal context below."
        : "No RETURN plan is supplied.",
    },
  ];
  return (
    <Section title="03. Decision Options">
      <ul className="m-0 list-none divide-y divide-slate-100 p-0">
        {options.map((option) => (
          <li
            key={option.title}
            className="space-y-1 py-3 first:pt-0 last:pb-0"
          >
            <h3 className="m-0! font-heading text-sm! uppercase text-slate-900">
              {option.title}
            </h3>
            <p className="m-0 text-xs leading-5 text-slate-700">
              {option.text}
            </p>
            <p className="m-0 text-[11px] leading-5 text-slate-500">
              {option.detail}
            </p>
          </li>
        ))}
      </ul>
      {children}
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
    <Section title="04. Decision Context">
      <div className="space-y-4 text-xs">
        <div>
          <h3 className="mb-2! font-heading text-xs! uppercase text-slate-600">
            Server capabilities
          </h3>
          {context.availableActions.length ? (
            <ul className="m-0 list-disc space-y-1 pl-4 text-slate-700">
              {context.availableActions.map((action, index) => (
                <li key={`${action}-${index}`} className="break-words">
                  {actionLabels[action] ?? action.replaceAll("_", " ")}
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-slate-500">
              No decision capabilities are supplied.
            </p>
          )}
        </div>
        <div className="border-t border-slate-100 pt-3">
          <h3 className="mb-2! font-heading text-xs! uppercase text-slate-600">
            Legal dossiers
          </h3>
          {["MAIN", "EXTRA"].map((type) => {
            const dossiers = context.complianceDossiers.filter(
              (dossier) => dossier.dossierType === type,
            );
            return (
              <div
                key={type}
                className="mb-2 flex min-w-0 items-start gap-3 last:mb-0"
              >
                <span className="w-10 shrink-0 font-medium">{type}</span>
                <div className="min-w-0 space-y-1 text-slate-600">
                  {dossiers.length
                    ? dossiers.map((dossier) => (
                        <p
                          key={dossier.complianceDossierId}
                          className="m-0 break-words"
                        >
                          {dossier.dossierCode} ·{" "}
                          {dossier.status.replaceAll("_", " ")}
                        </p>
                      ))
                    : "Not supplied"}
                </div>
              </div>
            );
          })}
          <p className="mt-3 mb-0 break-words text-slate-600">
            RETURN:{" "}
            {context.returnPlan
              ? `${context.returnPlan.routePlanCode} · ${context.returnPlan.status.replaceAll("_", " ")}`
              : "No plan supplied"}
          </p>
          {context.returnPlan && (
            <p
              className={`mt-1 mb-0 break-words ${context.returnPlan.isAvailable ? "text-slate-600" : "text-amber-800"}`}
            >
              Plan{" "}
              {context.returnPlan.isAvailable ? "available" : "unavailable"}
              {context.returnPlan.unavailableReason
                ? ` · ${context.returnPlan.unavailableReason.replaceAll("_", " ")}`
                : ""}
            </p>
          )}
          {context.returnPlan && !legalReady && (
            <p className="mt-2 mb-0 text-amber-800">
              RETURN activation requires approved MAIN and EXTRA dossiers; MAIN
              must be preserved.
            </p>
          )}
          {context.returnPlan?.checks
            .filter((check) => !check.passed)
            .map((check, index) => (
              <p
                key={`${check.code}-${index}`}
                className="mt-2 mb-0 break-words text-red-700"
              >
                {check.code.replaceAll("_", " ")}: {check.message}
              </p>
            ))}
        </div>
        {context.hold && (
          <div className="border-t border-slate-100 pt-3">
            <h3 className="mb-2! font-heading text-xs! uppercase text-slate-600">
              Recorded hold · {context.hold.status}
            </h3>
            <dl className="m-0 grid gap-3 sm:grid-cols-2">
              <Field label="Started">
                {formatPlanDate(context.hold.startedAt)}
              </Field>
              <Field label="Until">
                {formatPlanDate(context.hold.holdUntil)}
              </Field>
              <Field label="Duration">{context.hold.holdMinutes} min</Field>
              <Field label="Monitoring interval">
                {context.hold.monitorIntervalMinutes} min
              </Field>
              <Field label="Safe stop">
                {context.hold.safeStopLocation?.locationName}
              </Field>
              <Field label="Decided by">
                {context.hold.decidedBy.fullName}
              </Field>
            </dl>
            <p className="mt-3 mb-0 whitespace-pre-wrap break-words text-slate-700">
              {context.hold.reason}
            </p>
          </div>
        )}
      </div>
    </Section>
  );
}
