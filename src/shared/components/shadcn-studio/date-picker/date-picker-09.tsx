import * as React from "react"
import { Clock8Icon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"

export interface TimePickerWithIconProps
  extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> {
  value?: string
  onChange?: (value: string) => void
  label?: React.ReactNode
  labelClassName?: string
  wrapperClassName?: string
}

export function TimePickerWithIcon({
  id,
  value,
  onChange,
  onBlur,
  defaultValue,
  label,
  labelClassName,
  wrapperClassName,
  className,
  disabled,
  step = "60",
  "aria-label": ariaLabel,
  ...props
}: TimePickerWithIconProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(event.target.value)
  }

  return (
    <div className={cn("grid min-w-0 gap-1.5", wrapperClassName)}>
      {label ? (
        <Label
          htmlFor={inputId}
          className={cn("text-xs leading-4 font-medium", labelClassName)}
        >
          {label}
        </Label>
      ) : null}
      <div className="relative min-w-0">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center pl-3 text-muted-foreground peer-disabled:opacity-50">
          <Clock8Icon className="size-4" aria-hidden="true" />
          <span className="sr-only">Time</span>
        </div>
        <Input
          type="time"
          id={inputId}
          step={step}
          value={value ?? ""}
          defaultValue={defaultValue}
          onChange={handleChange}
          onBlur={onBlur}
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            "peer appearance-none bg-background pl-9 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none",
            className,
          )}
          {...props}
        />
      </div>
    </div>
  )
}

const TimePickerWithIconDemo = () => {
  return (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <Label htmlFor="time-picker-demo" className="px-1">
        Time input with start icon
      </Label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center pl-3 text-muted-foreground peer-disabled:opacity-50">
          <Clock8Icon className="size-4" />
          <span className="sr-only">Time</span>
        </div>
        <Input
          type="time"
          id="time-picker-demo"
          step="1"
          defaultValue="08:30:00"
          className="peer appearance-none bg-background pl-9 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      </div>
    </div>
  )
}

export { TimePickerWithIconDemo, TimePickerWithIcon as TimePicker }
export default TimePickerWithIconDemo
