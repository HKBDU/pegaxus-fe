import { useMemo, useState } from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { getCountryDataList } from "countries-list"

import { cn } from "@/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"

const countryOptions = getCountryDataList().sort((a, b) => a.name.localeCompare(b.name))

interface CountrySelectProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
  id?: string
  "aria-describedby"?: string
  "data-slot"?: string
  "aria-invalid"?: boolean
}

export function CountrySelect({ value, onValueChange, placeholder = "Select country", className, id, "aria-describedby": ariaDescribedBy, "data-slot": dataSlot, "aria-invalid": ariaInvalid }: CountrySelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const selectedCountry = countryOptions.find((country) => country.name === value)
  const filteredCountries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return countryOptions
    return countryOptions.filter((country) => `${country.name} ${country.native} ${country.iso2}`.toLowerCase().includes(normalizedQuery))
  }, [query])

  function selectCountry(countryName: string) {
    onValueChange(countryName)
    setQuery("")
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setQuery("") }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          id={id}
          data-slot={dataSlot}
          variant="outline"
          aria-expanded={open}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          className={cn("h-8 w-full justify-between rounded-[2px] border-[#f3aa3b] bg-transparent px-3 py-1 text-left text-xs font-normal text-[#181818] shadow-none hover:bg-transparent", !selectedCountry && "text-[#6c6963]", className)}
        >
          <span className="truncate">{(selectedCountry?.name ?? value) || placeholder}</span>
          <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={2} className="w-[var(--radix-popover-trigger-width)] min-w-64 rounded-[2px] border-slate-200 bg-white p-1 shadow-md">
        <div className="relative mb-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search country..." className="h-8 rounded-[2px] border-slate-300 pl-7 text-xs shadow-none focus-visible:border-amber-500 focus-visible:ring-amber-500/20" />
        </div>
        <div className="max-h-56 overflow-y-auto">
          {filteredCountries.length ? filteredCountries.map((country) => (
            <button type="button" key={country.iso2} onClick={() => selectCountry(country.name)} className="flex w-full items-center gap-2 rounded-[2px] px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-amber-50">
              <span className="truncate">{country.name}</span>
              <span className="ml-auto shrink-0 text-[10px] text-slate-400">{country.iso2}</span>
              <Check className={cn("size-3.5 shrink-0 text-amber-600", country.name === value ? "opacity-100" : "opacity-0")} />
            </button>
          )) : <p className="px-2 py-3 text-center text-xs text-slate-500">No country found.</p>}
        </div>
      </PopoverContent>
    </Popover>
  )
}
