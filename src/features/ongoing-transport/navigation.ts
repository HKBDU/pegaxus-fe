import { ROLE_ROUTES } from "@/app/route-config";

export function ongoingTransportDetailPath(transportId: string) {
  return `${ROLE_ROUTES.ongoingTransports}/${encodeURIComponent(transportId)}`;
}

// Phase 1 registers the list only. Do not turn prepared URLs into broken links.
export const ongoingTransportDetailAvailable = false;
