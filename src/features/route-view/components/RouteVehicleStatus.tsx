import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useEmergencyCostScope } from "@/features/incident-response/hooks/useEmergencyCostScope";
import { emergencyCostAuthScope } from "@/features/incident-response/services";
import { vehicleService, useFleetMocks } from "@/features/fleet/services";
import { getWorkspaceRole } from "@/features/transport-plan/workspace-role";
import { isFlow3MockMode } from "@/features/transport-plan/source";

const statusSchema = z.object({
  vehicleId: z.string(),
  status: z.enum([
    "AVAILABLE",
    "ASSIGNED",
    "IN_USE",
    "MAINTENANCE",
    "INACTIVE",
    "SUSPENDED",
    "OUT_OF_SERVICE",
  ]),
});
const labels: Record<z.infer<typeof statusSchema>["status"], string> = {
  AVAILABLE: "Available",
  ASSIGNED: "Assigned",
  IN_USE: "In use",
  MAINTENANCE: "Maintenance",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
  OUT_OF_SERVICE: "Out of service",
};

export function RouteVehicleStatus({ vehicleId }: { vehicleId: string }) {
  const { principal, signedIn, scope } = useEmergencyCostScope();
  const live = !useFleetMocks && !isFlow3MockMode();
  const permitted =
    signedIn &&
    ["manager", "coordinator"].includes(getWorkspaceRole(principal) ?? "");
  const query = useQuery({
    queryKey: ["route-view", "vehicle-status", scope, vehicleId, live],
    enabled: permitted && live && Boolean(vehicleId),
    retry: false,
    staleTime: 0,
    queryFn: async ({ signal }) => {
      signal.throwIfAborted();
      if (emergencyCostAuthScope() !== scope)
        throw new Error("Session changed.");
      const result = statusSchema.parse(await vehicleService.get(vehicleId));
      signal.throwIfAborted();
      if (
        emergencyCostAuthScope() !== scope ||
        result.vehicleId.toLowerCase() !== vehicleId.toLowerCase()
      )
        throw new Error("Vehicle status could not be verified.");
      return result.status;
    },
  });
  return (
    <span className="text-xs text-muted-foreground">
      {" "}
      ·{" "}
      {permitted && live && query.isPending
        ? "Loading vehicle status…"
        : permitted && live && query.data && !query.isError
          ? labels[query.data]
          : "Vehicle status unavailable"}
    </span>
  );
}
