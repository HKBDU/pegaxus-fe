import { useQuery } from "@tanstack/react-query";
import { useEmergencyCostScope } from "./useEmergencyCostScope";
import { rerouteIncidentIdSchema } from "../reroute-schemas";
import {
  canReadReroute,
  getRerouteContext,
  getRerouteError,
} from "../reroute-services";

export function useRerouteContext(id: string | undefined) {
  const { principal, signedIn, scope, source } = useEmergencyCostScope();
  const validId = rerouteIncidentIdSchema.safeParse(id).success;
  const allowed = signedIn && canReadReroute(principal);
  const queryKey = [
    "incident-response",
    "reroute-context",
    source,
    scope,
    id,
  ] as const;
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      getRerouteContext(rerouteIncidentIdSchema.parse(id), scope, signal),
    enabled: allowed && validId,
    staleTime: 15_000,
    retry: (count, error) => count < 1 && getRerouteError(error).retryable,
  });
  return { ...query, allowed, validId, principal, source, scope, queryKey };
}
