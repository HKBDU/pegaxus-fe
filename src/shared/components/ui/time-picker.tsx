import { useId, useState, type ReactNode } from "react";
import { Clock8Icon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Label } from "@/shared/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";

type TimePickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  label?: ReactNode;
  labelClassName?: string;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
};

const hours = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0"),
);
const minutes = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, "0"),
);

function TimePicker({
  id,
  value,
  onChange,
  onBlur,
  label,
  labelClassName,
  className,
  disabled,
  "aria-label": ariaLabel,
}: TimePickerProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [open, setOpen] = useState(false);
  const [hour = "", minute = ""] = value.split(":");

  const updateTime = (nextHour: string, nextMinute: string) => {
    onChange(`${nextHour || "00"}:${nextMinute || "00"}`);
  };

  return (
    <div className="grid min-w-0 gap-1.5">
      {label ? (
        <Label
          htmlFor={inputId}
          className={cn("text-xs leading-4 font-medium", labelClassName)}
        >
          {label}
        </Label>
      ) : null}
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) onBlur?.();
        }}
      >
        <PopoverTrigger asChild>
          <button
            id={inputId}
            type="button"
            disabled={disabled}
            aria-label={ariaLabel ?? label?.toString() ?? "Select time"}
            className={cn(
              "flex h-9 w-full min-w-0 items-center gap-2 rounded-[2px] border border-input bg-background px-3 text-left text-sm shadow-none outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
              className,
            )}
          >
            <Clock8Icon
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span className={cn("truncate", !value && "text-muted-foreground")}>
              {value || "--:--"}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 rounded-[2px] p-3" align="start">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500">Hour</p>
              <div className="grid max-h-52 grid-cols-4 gap-1 overflow-y-auto">
                {hours.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updateTime(option, minute)}
                    className={cn(
                      "min-h-9 rounded-[2px] border border-transparent text-sm hover:border-[#f39200] hover:bg-orange-50",
                      hour === option &&
                        "bg-[#f39200] font-bold text-[#181818]",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500">Minute</p>
              <div className="grid max-h-52 grid-cols-4 gap-1 overflow-y-auto">
                {minutes.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updateTime(hour, option)}
                    className={cn(
                      "min-h-9 rounded-[2px] border border-transparent text-sm hover:border-[#f39200] hover:bg-orange-50",
                      minute === option &&
                        "bg-[#f39200] font-bold text-[#181818]",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export { TimePicker, type TimePickerProps };
