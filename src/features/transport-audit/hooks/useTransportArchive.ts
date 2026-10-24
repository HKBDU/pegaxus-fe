import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/shared/hooks";
import { transportAuditService } from "../services";
import type { TransportArchiveQuery } from "../types";
export function useTransportArchive(params: TransportArchiveQuery) {
  const search = useDebounce(params.search ?? "", 300);
  return useQuery({
    queryKey: ["transport-audit", "archive", { ...params, search }],
    queryFn: ({ signal }) =>
      transportAuditService.archive({ ...params, search }, signal),
    enabled: params.search === search,
  });
}
