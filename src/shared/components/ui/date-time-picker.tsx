import * as React from "react"
import { cn } from "@/lib/utils"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { TimePicker } from "@/shared/components/ui/time-picker"

export interface DateTimePickerProps {
  /**
   * Combined local ISO string (`yyyy-MM-ddTHH:mm`), empty string when nothing is picked.
   */
  value?: string
  onChange: (value: string) => void
  onBlur?: () => void
  disabled?: boolean
  minDate?: string
  maxDate?: string
  placeholder?: string
  timeLabel?: string
  className?: string
  dateClassName?: string
  timeClassName?: string
  id?: string
  "aria-describedby"?: string
  "aria-label"?: string
  "aria-invalid"?: boolean
}

export const DateTimePicker = React.forwardRef<HTMLButtonElement, DateTimePickerProps>(
  function DateTimePicker(
    {
      value = "",
      onChange,
      onBlur,
      disabled = false,
      minDate,
      maxDate,
      placeholder = "DD / MM / YYYY",
      timeLabel = "Time",
      className,
      dateClassName,
      timeClassName,
      id,
      "aria-describedby": ariaDescribedBy,
      "aria-label": ariaLabel,
      "aria-invalid": ariaInvalid,
    },
    ref,
  ) {
    const [date = "", timeRaw = ""] = (value ?? "").split("T")
    const cleanTime = timeRaw.replace(/Z$/, "")
    const time = cleanTime.slice(0, 5)
    const seconds = cleanTime.split(":")[2]

    const handleDateChange = (nextDate: string) => {
      if (disabled) return
      const nextValue = nextDate ? `${nextDate}T${time || "00:00"}` : ""
      onChange(nextValue)
      onBlur?.()
    }

    const handleTimeChange = (nextTime: string) => {
      if (disabled) return
      const finalTime = nextTime
        ? `${nextTime}${seconds !== undefined ? `:${seconds}` : ""}`
        : ""
      const nextValue = finalTime
        ? `${date}T${finalTime}`
        : date
          ? `${date}T`
          : ""
      onChange(nextValue)
      onBlur?.()
    }

    return (
      <div
        className={cn(
          "@container grid min-w-0 gap-2 @min-[20rem]:grid-cols-[minmax(0,1fr)_9rem]",
          className,
        )}
      >
        <DatePicker
          ref={ref}
          id={id ? `${id}-date` : undefined}
          value={date}
          onChange={handleDateChange}
          onBlur={onBlur}
          minDate={minDate}
          maxDate={maxDate}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={ariaLabel ? `${ariaLabel} date` : undefined}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          className={cn(
            "h-9 rounded-[2px] border-slate-300 shadow-none",
            dateClassName,
          )}
        />
        <TimePicker
          id={id ? `${id}-time` : undefined}
          value={time}
          onChange={handleTimeChange}
          onBlur={onBlur}
          disabled={disabled}
          label={timeLabel}
          labelClassName="sr-only"
          aria-label={ariaLabel ? `${ariaLabel} time` : undefined}
          aria-describedby={ariaDescribedBy}
          className={cn(
            "h-9 rounded-[2px] border-slate-300 shadow-none",
            timeClassName,
          )}
        />
      </div>
    )
  },
)

DateTimePicker.displayName = "DateTimePicker"

