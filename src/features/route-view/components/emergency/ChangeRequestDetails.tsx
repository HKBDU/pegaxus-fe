import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatPlanDate } from "@/features/transport-plan/format";
import { incidentPaths } from "@/shared/constants/incident";
import { getRouteViewError, routeViewService } from "../../services";

/** What the Route Coordinator sent with the backup request, so the manager decides without opening the notification. */
export function ChangeRequestDetails({ routePlanId }: { routePlanId: string }) {
  const request = useQuery({
    queryKey: ["route-view", "change-request", routePlanId],
    queryFn: ({ signal }) => routeViewService.getChangeRequest(routePlanId, signal),
    retry: false,
  });

  if (request.isPending)
    return <p className="text-xs text-slate-500">Loading the coordinator's request…</p>;
  if (request.isError)
    return (
      <p role="alert" className="text-xs text-destructive">
        {getRouteViewError(request.error).message}
      </p>
    );
  const data = request.data;
  if (!data)
    return (
      <p className="text-sm leading-6 text-slate-600">
        The route coordinator has not sent a request for this backup yet.
      </p>
    );

  const big = data.impacts.length > 0;
  return (
    <div className="space-y-3">
      <div
        className={`flex gap-2 rounded-[2px] border px-3 py-2 text-sm leading-6 ${
          big ? "border-amber-300 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"
        }`}
      >
        {big ? (
          <AlertTriangle aria-hidden="true" className="mt-1 size-4 shrink-0" />
        ) : (
          <CheckCircle2 aria-hidden="true" className="mt-1 size-4 shrink-0" />
        )}
        {big ? (
          <div className="min-w-0">
            <p className="font-medium">Please check before approving:</p>
            <ul className="m-0 list-disc pl-5">
              {data.impacts.map((impact) => (
                <li key={impact}>{impact.charAt(0).toUpperCase() + impact.slice(1)}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="m-0 min-w-0">{data.summary}</p>
        )}
      </div>
      <dl className="grid min-w-0 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <Item label="Requested by">
          {data.requestedBy?.fullName ?? "Route coordinator"} · {formatPlanDate(data.requestedAt)}
        </Item>
        <Item label="New estimated arrival">{formatPlanDate(data.newEstimatedArrivalAt)}</Item>
        {data.incidentReportId && (
          <Item label="Incident">
            <Link className="underline" to={incidentPaths.detail("LM", data.incidentReportId)}>
              {data.incidentCode ?? "View incident"}
            </Link>
          </Item>
        )}
        <Item label="Reason" wide>
          <span className="whitespace-pre-line">{data.reason}</span>
        </Item>
        {data.note && (
          <Item label="Note" wide>
            <span className="whitespace-pre-line">{data.note}</span>
          </Item>
        )}
      </dl>
    </div>
  );
}

function Item({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={`min-w-0 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="m-0 break-words text-slate-800">{children}</dd>
    </div>
  );
}
