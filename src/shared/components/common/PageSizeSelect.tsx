import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"

type PageSizeSelectProps = {
  value: number
  onValueChange: (value: number) => void
  ariaLabel?: string
  options?: number[]
}

export function PageSizeSelect({
  value,
  onValueChange,
  ariaLabel = "Rows per page",
  options = [5, 10, 20],
}: PageSizeSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="whitespace-nowrap font-sans text-[11px] font-normal normal-case tracking-normal text-gray-500">
        Rows per page
      </span>
      <Select value={String(value)} onValueChange={(nextValue) => onValueChange(Number(nextValue))}>
        <SelectTrigger
          aria-label={ariaLabel}
          className="h-7 w-16 min-w-16 gap-1 rounded-[2px] bg-white px-2.5 font-sans text-xs data-[size=default]:h-7"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          position="popper"
          side="bottom"
          align="end"
          sideOffset={2}
          avoidCollisions={false}
          className="min-w-16 rounded-[2px] border-slate-200 bg-white p-0.5 font-sans shadow-md"
        >
          {options.map((pageSize) => (
            <SelectItem key={pageSize} value={String(pageSize)} className="h-7 rounded-[2px] text-xs">
              {pageSize}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
