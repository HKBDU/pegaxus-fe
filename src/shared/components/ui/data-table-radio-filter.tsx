import type { ReactNode } from "react"
import { Filter, X } from "lucide-react"

import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group"

export interface DataTableRadioOption {
  value: string
  label: string
}

interface DataTableRadioFilterProps {
  title: string
  value: string
  defaultValue?: string
  options: DataTableRadioOption[]
  onValueChange: (value: string) => void
  renderOption?: (option: DataTableRadioOption) => ReactNode
}

export function DataTableRadioFilter({
  title,
  value,
  defaultValue = "ALL",
  options,
  onValueChange,
  renderOption,
}: DataTableRadioFilterProps) {
  const selectedOption = options.find((option) => option.value === value)
  const isFiltered = value !== defaultValue

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 min-w-0 justify-start overflow-hidden rounded-[2px] border-slate-300 bg-white px-2.5 font-sans text-xs font-normal normal-case tracking-normal shadow-none">
          {isFiltered ? <X className="size-3.5 text-slate-500" /> : <Filter className="size-3.5 text-slate-500" />}
          {title}
          {isFiltered && selectedOption ? (
            <Badge variant="secondary" className="ml-auto truncate rounded-[2px] px-1.5 py-0 text-[0.62rem]">
              {selectedOption.label}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={2} className="w-44 rounded-[2px] border-slate-200 bg-white p-0.5 shadow-md">
        <RadioGroup value={value} onValueChange={onValueChange} className="gap-1">
          {options.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem] hover:bg-amber-50">
              <RadioGroupItem
                value={option.value}
                className="size-2.5 border-slate-300 shadow-none data-[state=checked]:border-[#ef8f00] data-[state=checked]:bg-[#ef8f00] [&_[data-slot=radio-group-indicator]]:hidden"
              />
              {renderOption ? renderOption(option) : <span>{option.label}</span>}
            </label>
          ))}
        </RadioGroup>
      </PopoverContent>
    </Popover>
  )
}
