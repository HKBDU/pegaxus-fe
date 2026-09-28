import type { ReactNode } from "react"
import { Filter, X } from "lucide-react"

import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"

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
  hideTitleWhenFiltered?: boolean
}

export function DataTableRadioFilter({
  title,
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 min-w-0 justify-start overflow-hidden rounded-[2px] border-slate-300 bg-white px-2.5 font-sans text-xs font-normal normal-case tracking-normal shadow-none">
          {isFiltered && hideTitleWhenFiltered && selectedOption ? <span className="truncate">{selectedOption.label}</span> : <>
            {isFiltered ? <X className="size-3.5 text-slate-500" /> : <Filter className="size-3.5 text-slate-500" />}
            {title}
          </>}
          {isFiltered && !hideTitleWhenFiltered && selectedOption ? (
            <Badge variant="secondary" className="ml-auto truncate rounded-[2px] px-1.5 py-0 text-[0.62rem]">
              {selectedOption.label}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={2} className="w-44 rounded-[2px] border-slate-200 bg-white p-0.5 shadow-md">
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value} className="h-7 rounded-[2px] py-1 text-[0.7rem]">
              {renderOption ? renderOption(option) : <span>{option.label}</span>}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
