import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEmergencyContacts } from "../services";
import { INCIDENT_REPORT_QUERY_KEYS } from "../constants/incident.constants";
import type { EmergencyContactsResponse } from "@/shared/types/incident";

const cacheKey = (transportId: string) =>
  `${INCIDENT_REPORT_QUERY_KEYS.contacts}:${transportId}`;

function readCache(transportId: string): EmergencyContactsResponse | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(cacheKey(transportId));
    return raw ? (JSON.parse(raw) as EmergencyContactsResponse) : undefined;
  } catch {
    return undefined;
  }
}

export function useEmergencyContacts(transportId?: string) {
  const cached = transportId ? readCache(transportId) : undefined;
  const query = useQuery({
    queryKey: [INCIDENT_REPORT_QUERY_KEYS.contacts, transportId],
    enabled: Boolean(transportId),
    queryFn: async () => {
      try {
        return await getEmergencyContacts(transportId as string);
      } catch (error) {
        if (cached) return cached;
        throw error;
      }
    },
    initialData: cached,
    staleTime: 5 * 60 * 1000,
    retry: false,
    networkMode: "always",
  });

  useEffect(() => {
    if (!transportId || !query.data || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        cacheKey(transportId),
        JSON.stringify(query.data),
      );
    } catch {
      // Cache failure must never block hotline display or form submission.
    }
  }, [transportId, query.data]);

  return {
    ...query,
    contacts: query.data?.contacts ?? [],
    isCached: Boolean(cached && query.data === cached),
  };
}
