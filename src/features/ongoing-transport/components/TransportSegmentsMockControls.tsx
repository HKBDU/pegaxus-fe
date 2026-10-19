import { FlaskConical } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { isOngoingTransportMockMode } from "../source";
import type { SegmentsScenario } from "../types";

const options: { value: SegmentsScenario; label: string }[] = [
  { value: "data", label: "Matching itinerary" },
  { value: "empty", label: "Empty itinerary" },
  { value: "no-boundaries", label: "No handover boundaries" },
  { value: "forbidden", label: "403 · Forbidden" },
  { value: "not-found", label: "404 · Not found" },
  { value: "invalid-status", label: "409 · Invalid transport status" },
  { value: "network-error", label: "Network error" },
  { value: "api-error", label: "API error" },
];

export function TransportSegmentsMockControls({
  scenario,
  onChange,
}: {
  scenario: SegmentsScenario;
  onChange: (value: SegmentsScenario) => void;
}) {
  if (import.meta.env.PROD || !isOngoingTransportMockMode()) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xs border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <span className="flex items-center gap-2">
        <FlaskConical aria-hidden="true" className="size-3.5" />
        MOCK DATA · Flow 4 development preview
      </span>
      <Select
        value={scenario}
        onValueChange={(value) => {
          const option = options.find((item) => item.value === value);
          if (option) onChange(option.value);
        }}
      >
        <SelectTrigger
          aria-label="Route tracking mock scenario"
          className="h-8 w-64 max-w-full rounded-xs bg-white text-xs"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
