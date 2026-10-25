import { useQuery } from "@tanstack/react-query";
import { emergencyCostIdSchema } from "../schemas";
import {
  canCreateEmergencyCosts,
  emergencyCostService,
  getEmergencyCostError,
} from "../services";
import { useEmergencyCostScope } from "./useEmergencyCostScope";

export function useEmergencyCostIncident(id: string | null) {
  const { principal, signedIn, scope, key } = useEmergencyCostScope();
  const validId = emergencyCostIdSchema.safeParse(id);
  const allowed = signedIn && canCreateEmergencyCosts(principal);
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
