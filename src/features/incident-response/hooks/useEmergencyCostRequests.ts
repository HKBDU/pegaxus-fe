import { useQuery } from "@tanstack/react-query";
import { canAccess, normalizeRole } from "@/features/auth/access-control";
import { useAuthStore } from "@/features/auth/store";
import { emergencyCostQuerySchema, type EmergencyCostQuery } from "../schemas";
import { canReadEmergencyCosts, emergencyCostService, getEmergencyCostError } from "../services";

export function useEmergencyCostRequests(input: EmergencyCostQuery, enabled = true) {
  const principal = useAuthStore((state) => state.principal);
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  const signedIn = useAuthStore((state) => Boolean(state.accessToken));
  const allowed = signedIn && canReadEmergencyCosts(principal);
  const parsed = emergencyCostQuerySchema.safeParse({
    ...input,
    status: input.status ?? (canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })
      ? "PENDING" : undefined),
  });
  const query = useQuery({
    queryKey: [
      "incident-response", "emergency-costs", principal?.id,
      principal?.roles.map(normalizeRole).sort(), sessionVersion,
      parsed.success ? parsed.data : input,
    ],
    queryFn: ({ signal }) => emergencyCostService.list(
      emergencyCostQuerySchema.parse(parsed.success ? parsed.data : input), signal,
    ),
    enabled: allowed && enabled && parsed.success,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: (count, error) => count < 1 && getEmergencyCostError(error).retryable,
  });
  return { ...query, allowed, validationError: parsed.success ? null : parsed.error };
}
