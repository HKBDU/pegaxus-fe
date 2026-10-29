import { formatUtcDateTime, formatUtcTime } from "@/shared/utils/datetime";

export function formatTransportDate(value: string | null | undefined) {
  return formatUtcDateTime(value);
}

export function formatTransportTime(value: string) {
  return formatUtcTime(value);
}

export function formatTransportLabel(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
