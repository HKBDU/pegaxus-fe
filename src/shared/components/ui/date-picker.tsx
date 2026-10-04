import * as React from "react"
import { format, isValid, parseISO } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Calendar } from "@/shared/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"

const VALUE_FORMAT = "yyyy-MM-dd"

function toDate(value?: string) {
  if (!value) return undefined
  const date = parseISO(value)
  return isValid(date) ? date : undefined
}

type DatePickerProps = Omit<React.ComponentProps<"button">, "value" | "onChange" | "onBlur"> & {
  /** ISO date string (`yyyy-MM-dd`), empty string when nothing is picked. */
  value?: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  displayFormat?: string
  /** Earliest selectable date (`yyyy-MM-dd`). */
  minDate?: string
  /** Latest selectable date (`yyyy-MM-dd`). */
  maxDate?: string
}

function DatePicker({
  value,
  onChange,
  onBlur,
  placeholder = "Pick a date",
  displayFormat = "dd / MM / yyyy",
  minDate,
  maxDate,
  className,
  ...props
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = toDate(value)
  const min = toDate(minDate)
  const max = toDate(maxDate)
  const thisYear = new Date().getFullYear()
  const disabledDates = [
    ...(min ? [{ before: min }] : []),
    ...(max ? [{ after: max }] : []),
  ]

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) onBlur?.()
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          data-empty={!selected}
          className={cn(
            "flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-left text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[empty=true]:text-muted-foreground disabled:pointer-events-none disabled:opacity-50",
            className,
          )}
          {...props}
        >
          <span className="truncate">{selected ? format(selected, displayFormat) : placeholder}</span>
          <CalendarIcon className="size-4 shrink-0 text-foreground" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange(date ? format(date, VALUE_FORMAT) : "")
            setOpen(false)
          }}
          captionLayout="dropdown"
          startMonth={min ?? new Date(thisYear - 100, 0)}
          endMonth={max ?? new Date(thisYear + 10, 11)}
          defaultMonth={selected ?? min}
          disabled={disabledDates.length ? disabledDates : undefined}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
