import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"

interface PersonnelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** Screen code from the inventory, e.g. SCR-F3-016. */
  code: string
  description: string
  children: ReactNode
  footer: ReactNode
  className?: string
}

/** Shared frame of the SCR-F3-016 … 019 dialogs, same look as the fleet dialogs. */
export function PersonnelDialog({ open, onOpenChange, title, code, description, children, footer, className }: PersonnelDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className={cn("flex max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-[2px] border-0 bg-white p-0 sm:max-w-[560px]", className)}>
        <DialogHeader className="shrink-0 gap-1 bg-[#e9e6de] px-5 py-3 text-left">
          <DialogTitle className="m-0! flex flex-wrap items-center gap-2 font-heading text-lg! font-bold! uppercase tracking-[0.02em]! text-[#ef8f00]!">
            <span className="inline-block size-2 bg-[#ef8f00]" aria-hidden="true" />
            {title}
            <span className="rounded-[3px] bg-white/70 px-1.5 py-0.5 font-sans text-[10px] font-semibold tracking-normal text-slate-600">{code}</span>
          </DialogTitle>
          <DialogDescription className="m-0 text-xs text-slate-600">{description}</DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-4">{children}</div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 bg-[#f5f3ee] px-5 py-3">{footer}</div>
      </DialogContent>
    </Dialog>
  )
}

export function CancelButton({ onClick, label = "Cancel" }: { onClick: () => void; label?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-9 rounded-[2px] border-0 bg-[#e0ded8] px-5 font-heading text-xs font-semibold uppercase tracking-[0.05em] text-slate-800 shadow-none hover:bg-[#d5d3cc]"
      onClick={onClick}
    >
      {label}
    </Button>
  )
}

export function PrimaryButton({
  children,
  disabled,
  type = "submit",
  onClick,
}: {
  children: ReactNode
  disabled?: boolean
  type?: "submit" | "button"
  onClick?: () => void
}) {
  return (
    <Button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="h-9 rounded-[2px] bg-[#ef8f00] px-5 font-heading text-xs font-semibold uppercase tracking-[0.05em] text-slate-950 hover:bg-[#db8300]"
    >
      {children}
    </Button>
  )
}

export function InfoNote({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" | "error" }) {
  const toneClass = {
    info: "border-sky-500 bg-sky-50 text-sky-900",
    warning: "border-amber-500 bg-amber-50 text-amber-900",
    error: "border-red-500 bg-red-50 text-red-800",
  }[tone]
  return (
    <p role={tone === "error" ? "alert" : undefined} className={cn("m-0 border-l-2 px-3 py-2 text-xs", toneClass)}>
      {children}
    </p>
  )
}
