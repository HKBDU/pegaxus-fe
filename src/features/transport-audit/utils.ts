import { formatUtcDateTime } from "@/shared/utils/datetime";

export function formatAuditDateTime(value?: string | null) {
  return formatUtcDateTime(value);
}
