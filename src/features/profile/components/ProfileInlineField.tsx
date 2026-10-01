import { Check, Pencil, X } from "lucide-react"
import { useEffect, useRef, type ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"

export type ProfileInlineFieldProps = {
  label: string
  value: string | null | undefined
  icon?: LucideIcon
  editing: boolean
  onEdit: () => void
  onChange: (value: string) => void
  onCommit: () => void
  onCancel: () => void
  editor?: ReactNode
  compact?: boolean
  className?: string
}

export function ProfileInlineField({
  label,
  value,
  icon: Icon,
  editing,
  onEdit,
  onChange,
  onCommit,
  onCancel,
  editor,
  compact = false,
  className,
}: ProfileInlineFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && !editor) inputRef.current?.focus()
  }, [editing, editor])

  if (compact) {
    return editing ? (
      <div className={cn("flex w-full max-w-[300px] items-center gap-1", className)}>
        <Input
          ref={inputRef}
          aria-label={label}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onCommit()
            if (event.key === "Escape") onCancel()
          }}
          className="profile-edit-field !h-9 !min-w-0 !flex-1 !px-2 !py-1 !text-[#181818] text-lg font-bold sm:text-xl"
        />
        <Button type="button" size="icon" className="size-8 shrink-0 rounded-[5px] bg-[#f39200] hover:bg-[#d97f00]" aria-label={`Save ${label}`} onClick={onCommit}>
          <Check className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 rounded-[5px] text-white hover:bg-white/15 hover:text-white" aria-label={`Cancel ${label}`} onClick={onCancel}>
          <X className="size-4" />
        </Button>
      </div>
    ) : (
      <button
        type="button"
        className={cn("group inline-flex max-w-full items-center gap-2 text-left", className)}
        onClick={onEdit}
        aria-label={`Edit ${label}`}
      >
        <span className="truncate text-2xl font-bold leading-tight text-white">{value || "Unnamed"}</span>
        <Pencil className="size-4 shrink-0 text-white/75 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
      </button>
    )
  }

  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase leading-[16.5px] tracking-[0.55px] text-[#6c6963]">
        {Icon && <Icon className="size-3.5 text-[#8b857c]" aria-hidden="true" />}
        {label}
      </span>
      {editing ? (
        <div className="flex min-w-0 items-center gap-1.5 [&>*:first-child]:min-w-0 [&>*:first-child]:flex-1">
          {editor ?? (
            <Input
              ref={inputRef}
              aria-label={label}
              value={value ?? ""}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onCommit()
                if (event.key === "Escape") onCancel()
              }}
              className="profile-edit-field !h-9 !min-w-0 !px-3 !py-1"
            />
          )}
          <Button type="button" size="icon" className="size-8 shrink-0" aria-label={`Save ${label}`} onClick={onCommit}>
            <Check className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" aria-label={`Cancel ${label}`} onClick={onCancel}>
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          className="group flex min-h-10 min-w-0 items-center justify-between gap-3 border-b border-[#e4e0d9] px-1 py-2 text-left transition-colors hover:border-[#f39200] hover:bg-[#fffaf1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f39200]"
          onClick={onEdit}
          aria-label={`Edit ${label}`}
        >
          <span className="truncate text-[13px] font-medium leading-[21px] text-[#181818]">{value || "Not provided"}</span>
          <Pencil className="size-3.5 shrink-0 text-[#9a948b] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
