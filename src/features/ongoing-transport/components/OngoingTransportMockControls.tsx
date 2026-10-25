import { FlaskConical } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { isOngoingTransportMockMode } from "../source";
import type { MockScenario } from "../types";

const scenarios: { value: MockScenario; label: string }[] = [
  { value: "data", label: "Data · 48 transports" },
  { value: "empty", label: "Empty list" },
  { value: "api-error", label: "API error" },
  { value: "network-error", label: "Network error" },
];

export function OngoingTransportMockControls({
  scenario,
  onChange,
}: {
  scenario: MockScenario;
  onChange: (scenario: MockScenario) => void;
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
          const option = scenarios.find((item) => item.value === value);
          if (option) onChange(option.value);
        }}
      >
        <SelectTrigger
          aria-label="Mock preview scenario"
          className="h-7 w-48 rounded-xs bg-white text-xs data-[size=default]:h-7"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-xs motion-reduce:animate-none">
          {scenarios.map((item) => (
            <SelectItem className="text-xs" key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
