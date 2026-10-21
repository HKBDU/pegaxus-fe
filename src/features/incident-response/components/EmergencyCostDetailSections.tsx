import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  CategoryBadge,
  CostStatusBadge,
  SeverityBadge,
  StatusBadge,
  VndText,
} from "@/shared/components/incident";
import { EMERGENCY_COST_CATEGORY_LABELS } from "@/shared/constants/incident";
import {
  emergencyCostDetailPath,
  type EmergencyCostAudience,
} from "../navigation";
import { emergencyCostIdSchema, type EmergencyCostDetail } from "../schemas";
import type { CostEvidencePreview } from "../mocks/repository";
import { CostEvidenceGallery } from "./EmergencyCostEvidence";

const dateFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});
const date = (value: string) => (
  <time dateTime={value}>{dateFormat.format(new Date(value))}</time>
);

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 space-y-3 rounded-xs border border-border bg-card p-4 sm:p-5">
      <h2 className="m-0 font-heading text-xl uppercase tracking-wide">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Details({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="m-0 grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-x-3 gap-y-2 text-sm [overflow-wrap:anywhere]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="m-0 min-w-0">{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EmergencyCostDetailSections({
  request,
  evidence,
  audience,
  mock,
}: {
  request: EmergencyCostDetail;
  evidence: readonly CostEvidencePreview[];
  audience: EmergencyCostAudience;
  mock: boolean;
}) {
  const incident = request.incidentSummary;
  const health = request.horseHealthSummary;
  const route = request.currentRoute;
  const decision = request.decision;
  return (
    <>
      <section
        className="grid min-w-0 gap-3 rounded-xs border border-primary/25 bg-primary/5 p-4 sm:grid-cols-2 sm:p-5"
        aria-label="Request amounts"
      >
        <div>
          <p className="m-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Requested amount
          </p>
          <p className="mt-1 mb-0 text-2xl font-semibold tabular-nums [overflow-wrap:anywhere]">
            <VndText amount={request.requestedAmount} />
          </p>
        </div>
        <div>
          <p className="m-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Approved amount
          </p>
          <p className="mt-1 mb-0 text-xl font-semibold tabular-nums [overflow-wrap:anywhere]">
            {request.approvedAmount == null ? (
              "Not supplied"
            ) : (
              <VndText amount={request.approvedAmount} />
            )}
          </p>
        </div>
      </section>
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
        <Section title="Request information">
          <Details
            rows={[
              ["Category", EMERGENCY_COST_CATEGORY_LABELS[request.category]],
              ["Status", <CostStatusBadge status={request.status} />],
              [
                "Requested by",
                request.requestedBy
                  ? `${request.requestedBy.fullName} · ${request.requestedBy.role}`
                  : null,
              ],
              ["Requested at", date(request.requestedAt)],
              [
                "VAT invoice",
                request.invoiceRequired == null
                  ? "Not supplied by the backend"
                  : request.invoiceRequired
                    ? "Required"
                    : "Not required",
              ],
            ]}
          />
          <div>
            <h3 className="m-0 text-sm font-semibold">Description</h3>
            <p className="mt-1 mb-0 text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">
              {request.description}
            </p>
          </div>
          <div>
            <h3 className="m-0 text-sm font-semibold">Justification</h3>
            <p className="mt-1 mb-0 text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">
              {request.justification}
            </p>
          </div>
        </Section>
        <Section title="Incident context">
          {incident ? (
            <>
              <p className="m-0 text-sm font-semibold [overflow-wrap:anywhere]">
                {incident.incidentCode} · {incident.title}
              </p>
              <div className="flex flex-wrap gap-2">
                <CategoryBadge category={incident.category} />
                <SeverityBadge severity={incident.severity} />
                <StatusBadge status={incident.status} />
              </div>
              <Details
                rows={[
                  ["Occurred at", date(incident.occurredAt)],
                  ["Transport ID", request.incident.transportId],
                  [
                    "Incident location",
                    incident.location
                      ? [
                          incident.location.locationName,
                          incident.location.city,
                          incident.location.country,
                        ]
                          .filter(Boolean)
                          .join(", ")
                      : null,
                  ],
                  [
                    "Vehicle",
                    incident.vehicle
                      ? `${incident.vehicle.vehicleCode} · ${incident.vehicle.licensePlate}`
                      : null,
                  ],
                  ["Vehicle status", incident.vehicle?.status],
                ]}
              />
            </>
          ) : (
            <p className="m-0 text-sm text-muted-foreground">
              Incident context is not supplied. No location or vehicle is
              inferred.
            </p>
          )}
        </Section>
        <Section title="Operational context">
          <Details
            rows={[
              ["Route plan", route?.routePlanCode],
              [
                "Route type / status",
                route ? `${route.routeType} · ${route.status}` : null,
              ],
              [
                "Horse health",
                health
                  ? `${health.total} total · ${health.normal} normal · ${health.observationRequired} observation · ${health.atRisk} at risk · ${health.critical} critical · ${health.noData} no data`
                  : "Not supplied",
              ],
              ["Server time", date(request.serverTime)],
            ]}
          />
        </Section>
        <Section title="Supporting evidence">
          {evidence.length ? (
            <CostEvidenceGallery photos={evidence} />
          ) : (
            <p className="m-0 text-sm text-muted-foreground">
              {mock
                ? "No local mock evidence is attached to this request."
                : "Persisted cost photos are not exposed by the current CO3 contract. No receipt or upload history is inferred."}
            </p>
          )}
          {mock && evidence.length ? (
            <p className="m-0 text-xs text-muted-foreground">
              Local mock presentation only; not verified storage evidence.
            </p>
          ) : null}
        </Section>
      </div>
      <Section title="Other cost requests for this incident">
        {request.otherRequests.length ? (
          <ul className="m-0 list-none divide-y divide-border p-0">
            {request.otherRequests.map((other) => (
              <li
                key={other.emergencyCostRequestId}
                className="flex min-w-0 flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 text-sm [overflow-wrap:anywhere]">
                  {emergencyCostIdSchema.safeParse(other.emergencyCostRequestId)
                    .success ? (
                    <Link
                      className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline focus-visible:outline focus-visible:outline-2"
                      to={emergencyCostDetailPath(
                        audience,
                        other.emergencyCostRequestId,
                        request.incident.incidentReportId,
                      )}
                    >
                      {other.requestCode}
                    </Link>
                  ) : (
                    <span>{other.requestCode}</span>
                  )}
                  <p className="m-0 text-xs text-muted-foreground">
                    {EMERGENCY_COST_CATEGORY_LABELS[other.category]}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm tabular-nums">
                  <VndText amount={other.requestedAmount} />
                  <CostStatusBadge status={other.status} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-sm text-muted-foreground">
            No other requests are returned for this incident.
          </p>
        )}
      </Section>
      <Section title="Decision and request metadata">
        {request.status === "PENDING" ? (
          <p className="m-0 text-sm">
            Awaiting review. Approval, rejection and cancellation are not
            available in this feature batch.
          </p>
        ) : null}
        {decision ? (
          <Details
            rows={[
              ["Decision", decision.decision],
              ["Approved amount", <VndText amount={decision.approvedAmount} />],
              ["Decided by", decision.decidedBy?.fullName],
              ["Decided at", date(decision.decidedAt)],
              [
                "Reason",
                <span className="whitespace-pre-wrap">
                  {decision.decisionReason ?? "—"}
                </span>,
              ],
            ]}
          />
        ) : request.status === "APPROVED" || request.status === "REJECTED" ? (
          <p className="m-0 text-sm text-muted-foreground">
            Decision metadata is not supplied. The returned status remains
            read-only.
          </p>
        ) : null}
        {request.status === "CANCELLED" ? (
          <Details
            rows={[
              [
                "Cancelled at",
                request.cancelledAt ? date(request.cancelledAt) : null,
              ],
              ["Cancellation reason", request.cancellationReason],
            ]}
          />
        ) : null}
        <Details
          rows={[
            ["Created", date(request.createdAt)],
            ["Last updated", date(request.updatedAt)],
          ]}
        />
      </Section>
    </>
  );
}
