import type { ReactNode } from "react"
import { Check, ChevronDown } from "lucide-react"

import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"

export interface DataTableRadioOption {
  value: string
  label: string
}

interface DataTableRadioFilterProps {
  title: string
  ariaLabel?: string
  value: string
  defaultValue?: string
  options: DataTableRadioOption[]
  onValueChange: (value: string) => void
  renderOption?: (option: DataTableRadioOption) => ReactNode
  hideTitleWhenFiltered?: boolean
}

export function DataTableRadioFilter({
  title,
  ariaLabel,
  value,
  defaultValue = "ALL",
  options,
  onValueChange,
  renderOption,
  hideTitleWhenFiltered = false,
}: DataTableRadioFilterProps) {
  const selectedOption = options.find((option) => option.value === value)
  const isFiltered = value !== defaultValue

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button aria-label={ariaLabel ?? title} variant="outline" size="sm" className="h-8 min-w-0 justify-start overflow-hidden rounded-[2px] border-slate-300 bg-white px-2.5 font-sans text-xs font-normal normal-case tracking-normal shadow-none">
          <span className="truncate">{isFiltered && hideTitleWhenFiltered && selectedOption ? selectedOption.label : title}</span>
          {isFiltered && !hideTitleWhenFiltered && selectedOption ? (
            <Badge variant="secondary" className="ml-auto truncate rounded-[2px] px-1.5 py-0 text-[0.62rem]">
              {selectedOption.label}
            </Badge>
          ) : (
            <ChevronDown className="ml-auto size-3.5 shrink-0 text-slate-500" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={2}
        className="w-[var(--radix-popover-trigger-width)] rounded-[2px] border-slate-200 bg-white p-0.5 shadow-md"
      >
        <div role="radiogroup" aria-label={ariaLabel ?? title} className="grid gap-1">
          {options.map((option) => (
            <button
              type="button"
              role="radio"
              aria-checked={option.value === value}
              key={option.value}
              onClick={() => onValueChange(option.value)}
              className="flex w-full cursor-pointer items-center gap-1.5 rounded-[2px] border-0 px-1.5 py-1 text-left text-[0.7rem] outline-none transition-colors duration-150 hover:bg-amber-50 focus-visible:bg-amber-50 active:bg-amber-50"
            >
              <span className="min-w-0 flex-1 truncate">
                {renderOption ? renderOption(option) : option.label}
              </span>
              <Check
                aria-hidden="true"
                className={`size-3.5 shrink-0 text-amber-600! ${option.value === value ? "opacity-100" : "opacity-0"}`}
              />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
