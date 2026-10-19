import { useId, type ComponentProps, type ReactNode } from "react";
import { Clock8Icon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

type TimePickerProps = Omit<
  ComponentProps<typeof Input>,
  "type" | "value" | "defaultValue" | "onChange"
> & {
  value: string;
  onChange: (value: string) => void;
  label?: ReactNode;
  labelClassName?: string;
};

function TimePicker({
  id,
  value,
  onChange,
  label,
  labelClassName,
  className,
  disabled,
  step = 60,
  ...props
}: TimePickerProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

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
      <div className="relative min-w-0">
        <Clock8Icon
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-0 left-3 my-auto size-4 text-muted-foreground",
            disabled && "opacity-50",
          )}
        />
        <Input
          {...props}
          id={inputId}
          type="time"
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className={cn(
            "h-9 appearance-none rounded-[2px] bg-background pl-9 pr-2 text-sm shadow-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none",
            className,
          )}
        />
      </div>
    </div>
  );
}

export { TimePicker, type TimePickerProps };
