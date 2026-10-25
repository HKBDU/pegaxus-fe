import { useQuery } from "@tanstack/react-query";
import { canAccess } from "@/features/auth/access-control";
import { emergencyCostQuerySchema, type EmergencyCostQuery } from "../schemas";
import {
  canReadEmergencyCosts,
  emergencyCostService,
  getEmergencyCostError,
} from "../services";
import { useEmergencyCostScope } from "./useEmergencyCostScope";

export function useEmergencyCostRequests(
  input: EmergencyCostQuery,
  enabled = true,
) {
  const { principal, signedIn, scope, key } = useEmergencyCostScope();
  const allowed = signedIn && canReadEmergencyCosts(principal);
  const parsed = emergencyCostQuerySchema.safeParse({
    ...input,
    status:
      input.status ??
      (canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })
        ? "PENDING"
        : undefined),
  });
  const query = useQuery({
    queryKey: [...key, "list", parsed.success ? parsed.data : input],
    queryFn: ({ signal }) =>
      emergencyCostService.list(
        emergencyCostQuerySchema.parse(parsed.success ? parsed.data : input),
        signal,
        scope,
      ),
    enabled: allowed && enabled && parsed.success,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: (count, error) =>
      count < 1 && getEmergencyCostError(error).retryable,
  });
  return {
    ...query,
    allowed,
    validationError: parsed.success ? null : parsed.error,
  };
}
