import { useQuery } from "@tanstack/react-query";
import { canAccess } from "@/features/auth/access-control";
import { emergencyCostIdSchema } from "../schemas";
import {
  canCreateEmergencyCosts,
  canReadEmergencyCosts,
  emergencyCostService,
  getEmergencyCostError,
} from "../services";
import { useEmergencyCostScope } from "./useEmergencyCostScope";

export function useEmergencyCostIncident(
  id: string | null,
  purpose: "create" | "decision" = "create",
) {
  const { principal, signedIn, scope, key } = useEmergencyCostScope();
  const validId = emergencyCostIdSchema.safeParse(id);
  const allowed =
    signedIn &&
    (purpose === "decision"
      ? canReadEmergencyCosts(principal) &&
        canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })
      : canCreateEmergencyCosts(principal));
  const query = useQuery({
    queryKey: [...key, "incident-context", id],
    queryFn: ({ signal }) =>
      emergencyCostService.getIncidentContext(
        emergencyCostIdSchema.parse(id),
        signal,
        scope,
      ),
    enabled: allowed && validId.success,
    staleTime: 0,
    retry: (count, error) =>
      count < 1 && getEmergencyCostError(error, "context").retryable,
  });
  return { ...query, allowed, validId: validId.success };
}
