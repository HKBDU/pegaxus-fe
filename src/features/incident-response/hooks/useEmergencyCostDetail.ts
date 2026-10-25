import { useQuery } from "@tanstack/react-query";
import { emergencyCostIdSchema } from "../schemas";
import {
  canReadEmergencyCosts,
  emergencyCostService,
  getEmergencyCostError,
} from "../services";
import { useEmergencyCostScope } from "./useEmergencyCostScope";

export function useEmergencyCostDetail(id: string | undefined) {
  const { principal, signedIn, scope, key } = useEmergencyCostScope();
  const validId = emergencyCostIdSchema.safeParse(id);
  const allowed = signedIn && canReadEmergencyCosts(principal);
  const query = useQuery({
    queryKey: [...key, "detail", id],
    queryFn: ({ signal }) =>
      emergencyCostService.getDetail(
        emergencyCostIdSchema.parse(id),
        signal,
        scope,
      ),
    enabled: allowed && validId.success,
    staleTime: 15_000,
    retry: (count, error) =>
      count < 1 && getEmergencyCostError(error, "detail").retryable,
  });
  return { ...query, allowed, validId: validId.success };
}
