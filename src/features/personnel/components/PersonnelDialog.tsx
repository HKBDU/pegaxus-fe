import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"

interface PersonnelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  children: ReactNode
  footer: ReactNode
  className?: string
}

/**
 * Shared frame of the personnel dialogs (Phase 1, Phase 2, replace, schedule conflict): one plain white surface, like the
 * other dialogs of the web. Title, content and buttons scroll together, so there is no fixed band above or below.
 */
export function PersonnelDialog({ open, onOpenChange, title, description, children, footer, className }: PersonnelDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className={cn("max-h-[90dvh] gap-0 overflow-y-auto rounded-[2px] bg-white p-6 sm:max-w-[720px]", className)}>
        <DialogHeader className="gap-1.5 text-left">
          <DialogTitle className="m-0! font-heading text-lg! font-bold! uppercase tracking-[0.04em]! text-[#181818]!">{title}</DialogTitle>
          <DialogDescription className="m-0 text-xs leading-5 text-gray-600">{description}</DialogDescription>
        </DialogHeader>
        <div className="mt-4 grid gap-4">{children}</div>
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">{footer}</div>
      </DialogContent>
    </Dialog>
  )
}

export function CancelButton({ onClick, label = "Cancel" }: { onClick: () => void; label?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-9 rounded-[2px] border border-gray-900 bg-white px-5 font-heading text-xs font-semibold uppercase tracking-[0.04em] text-gray-900 shadow-none hover:bg-gray-100"
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
      className="h-9 rounded-[2px] border border-primary bg-primary px-5 font-heading text-xs font-semibold uppercase tracking-[0.04em] text-gray-900 shadow-none hover:border-primary-hover hover:bg-primary-hover"
    >
      {children}
    </Button>
  )
}

export function InfoNote({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" | "error" }) {
  const toneClass = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    error: "border-red-200 bg-red-50 text-red-700",
  }[tone]
  return (
    <p role={tone === "error" ? "alert" : undefined} className={cn("m-0 rounded-[2px] border px-3 py-2 text-xs leading-5", toneClass)}>
      {children}
    </p>
  )
}
