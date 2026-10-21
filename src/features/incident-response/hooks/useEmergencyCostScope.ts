import { useAuthStore } from "@/features/auth/store";
import { normalizeRole } from "@/features/auth/access-control";
import { emergencyCostSource } from "../source";

export function useEmergencyCostScope() {
  const principal = useAuthStore((state) => state.principal);
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  const signedIn = useAuthStore((state) => Boolean(state.accessToken));
  const scope = JSON.stringify([
    principal?.id,
    sessionVersion,
    principal?.roles.map(normalizeRole).sort(),
    signedIn,
  ]);
  const source = emergencyCostSource();
  return {
    principal,
    signedIn,
    scope,
    source,
    key: ["incident-response", "emergency-costs", source, scope] as const,
  };
}
