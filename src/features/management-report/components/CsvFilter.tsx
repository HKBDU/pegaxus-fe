import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/shared/components/ui/dropdown-menu";
import { reportLabel } from "../presentation";

export function CsvFilter({
  id,
  label,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = new Set(
    value
      .split(",")
      .map((part) => part.trim().toUpperCase())
      .filter(Boolean),
  );
  const names = options
    .filter((option) => selected.has(option))
    .map(reportLabel);
  function toggle(option: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(option);
    else next.delete(option);
    onChange(options.filter((item) => next.has(item)).join(","));
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          id={id}
          variant="outline"
          title={names.join(", ")}
          className="h-9 w-full min-w-0 justify-between rounded-[2px] px-3 text-left text-sm font-normal"
        >
          <span className="truncate">
            {names.length === 0
              ? "All"
              : names.length === 1
                ? names[0]
                : `${names.length} selected`}
          </span>
          <ChevronsUpDown aria-hidden="true" className="size-3.5 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-80 w-64 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-[2px]"
      >
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => onChange("")}>
          All {label.toLowerCase()}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option}
            checked={selected.has(option)}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={(checked) => toggle(option, checked === true)}
            className="text-xs"
          >
            {reportLabel(option)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
