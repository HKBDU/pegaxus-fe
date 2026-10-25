import { useId, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ErrorState } from "@/shared/components/common";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { EmergencyCostList } from "../components/EmergencyCostList";
import { EmergencyCostModeNotice } from "../components/EmergencyCostModeNotice";
import { useEmergencyCostScope } from "../hooks/useEmergencyCostScope";
import {
  emergencyCostCreatePath,
  type EmergencyCostAudience,
} from "../navigation";
import { emergencyCostIdSchema } from "../schemas";
import { canCreateEmergencyCosts } from "../services";

export default function EmergencyCostListPage({
  audience,
}: {
  audience: EmergencyCostAudience;
}) {
  const [search] = useSearchParams();
  const incidentReportId = search.get("incidentReportId") ?? undefined;
  const transportId = search.get("transportId") ?? undefined;
  const { principal, scope } = useEmergencyCostScope();
  if (
    [incidentReportId, transportId].some(
      (id) => id !== undefined && !emergencyCostIdSchema.safeParse(id).success,
    )
  )
    return (
      <ErrorState message="The incident or transport scope must be a valid UUID. No request is sent." />
    );
  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl space-y-4 p-4 font-sans sm:p-6">
      <EmergencyCostModeNotice />
      {canCreateEmergencyCosts(principal) ? (
        <CreateEntry
          key={`${scope}:${incidentReportId ?? ""}`}
          audience={audience}
          incidentReportId={incidentReportId}
        />
      ) : null}
      <EmergencyCostList
        routeAudience={audience}
        incidentReportId={incidentReportId}
        transportId={transportId}
      />
    </main>
  );
}

function CreateEntry({
  audience,
  incidentReportId,
}: {
  audience: EmergencyCostAudience;
  incidentReportId?: string;
}) {
  const id = useId();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(incidentReportId ?? "");
  const valid = emergencyCostIdSchema.safeParse(incident.trim()).success;
  return (
    <form
      className="flex min-w-0 flex-wrap items-end gap-2 rounded-xs border border-border bg-card p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) navigate(emergencyCostCreatePath(audience, incident.trim()));
      }}
    >
      <div className="min-w-0 flex-[1_1_18rem] space-y-1">
        <Label htmlFor={id}>Create for incident</Label>
        <Input
          id={id}
          value={incident}
          readOnly={Boolean(incidentReportId)}
          onChange={(event) => setIncident(event.target.value)}
          placeholder="Incident UUID"
          className="min-h-11 rounded-xs"
          aria-describedby={`${id}-hint`}
        />
        <p id={`${id}-hint`} className="m-0 text-xs text-muted-foreground">
          Use an existing incident ID. Assignment and eligibility are checked on
          the next page.
        </p>
      </div>
      <Button type="submit" disabled={!valid} className="min-h-11 rounded-xs">
        New request
      </Button>
    </form>
  );
}
