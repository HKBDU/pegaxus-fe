import { Plus } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorState } from "@/shared/components/common";
import { PageHeader } from "@/shared/components/PageHeader";
import { Button } from "@/shared/components/ui/button";
import { ROLE_ROUTES } from "@/app/route-config";
import { incidentRoutes } from "@/features/incident-management/constants";
import { EmergencyCostList } from "../components/EmergencyCostList";
import { EmergencyCostModeNotice } from "../components/EmergencyCostModeNotice";
import { useEmergencyCostScope } from "../hooks/useEmergencyCostScope";
import {
  emergencyCostCreatePath,
  type EmergencyCostAudience,
} from "../navigation";
import { emergencyCostIdSchema } from "../schemas";
import { canCreateEmergencyCosts } from "../services";

/**
 * The emergency cost list, in the same frame as the web's other list pages: a compact page header with its back link and
 * a "New request" action, then the list. The old "Create for incident" box asked people to type an incident UUID (and
 * showed it raw when the page was opened from an incident); a request now starts from a known incident only.
 */
export default function EmergencyCostListPage({
  audience,
}: {
  audience: EmergencyCostAudience;
}) {
  const [search] = useSearchParams();
  const incidentReportId = search.get("incidentReportId") ?? undefined;
  const transportId = search.get("transportId") ?? undefined;
  const { principal } = useEmergencyCostScope();
  if (
    [incidentReportId, transportId].some(
      (id) => id !== undefined && !emergencyCostIdSchema.safeParse(id).success,
    )
  )
    return (
      <ErrorState message="The incident or transport scope must be a valid UUID. No request is sent." />
    );
  // Back to the incident the list was opened from, otherwise to the audience's home for incidents.
  const back = incidentReportId
    ? {
        href:
          audience === "crew"
            ? incidentRoutes.crewDetail(incidentReportId)
            : incidentRoutes.adminDetail(incidentReportId),
        label: "Incident",
      }
    : audience === "crew"
      ? { href: "/crew/transports", label: "Assigned transports" }
      : { href: ROLE_ROUTES.incidents, label: "Incidents" };
  const canCreate = Boolean(incidentReportId) && canCreateEmergencyCosts(principal);
  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl space-y-4 p-4 font-sans sm:p-6">
      <div>
        <PageHeader
          title="Emergency costs"
          size="compact"
          backHref={back.href}
          backLabel={back.label}
          action={
            canCreate ? (
              <Button asChild size="sm" className="rounded-xs">
                <Link to={emergencyCostCreatePath(audience, incidentReportId!)}>
                  <Plus aria-hidden="true" />
                  New request
                </Link>
              </Button>
            ) : undefined
          }
        />
        <p className="mt-1 mb-0 text-xs text-slate-500 sm:text-sm">
          View and monitor emergency expenses. Dates use your local timezone.
        </p>
      </div>
      <EmergencyCostModeNotice />
      <EmergencyCostList
        routeAudience={audience}
        incidentReportId={incidentReportId}
        transportId={transportId}
        hideHeading
      />
    </main>
  );
}
