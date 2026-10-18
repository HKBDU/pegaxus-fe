import { useQuery } from "@tanstack/react-query"

import { getAssignedTransports } from "../services"

export function useAssignedTransports() {
  return useQuery({
    queryKey: ["horse-health", "assigned-transports"],
    queryFn: ({ signal }) => getAssignedTransports(signal),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  })
}
