import { FileSpreadsheet, FileText } from "lucide-react"
import { useState } from "react"

import { cn } from "@/lib/utils"
import type { ExportFormat } from "@/features/dossier/types"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"

const FORMATS: { value: ExportFormat; label: string; hint: string; icon: typeof FileText }[] = [
  { value: "xlsx", label: "Excel (.xlsx)", hint: "Spreadsheet with one row per dossier", icon: FileSpreadsheet },
  { value: "pdf", label: "PDF (.pdf)", hint: "Printable report", icon: FileText },
]

interface ExportReportDialogProps {
  open: boolean
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (format: ExportFormat) => void
}

/** UC-30 ALT-01: pick the file type; the report always follows the filters currently applied (K2 keeps the K1 query). */
export function ExportReportDialog({ open, isPending, onOpenChange, onConfirm }: ExportReportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>("xlsx")

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent className="gap-4 rounded-[2px] border-slate-200 bg-white p-5 sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle className="m-0! font-heading text-lg! font-semibold! tracking-normal! text-slate-900">Export progress report</DialogTitle>
          <DialogDescription className="text-xs leading-4 text-slate-600">The report contains the dossiers that match the filters currently applied.</DialogDescription>
        </DialogHeader>

        <div role="radiogroup" aria-label="File format" className="grid gap-2">
          {FORMATS.map(({ value, label, hint, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={format === value}
              onClick={() => setFormat(value)}
              className={cn(
                "flex items-center gap-3 rounded-[2px] border px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                format === value ? "border-amber-500 bg-amber-50" : "border-slate-200 hover:bg-slate-50",
              )}
            >
              <Icon className="size-5 shrink-0 text-amber-600" aria-hidden="true" />
              <span className="grid">
                <span className="text-sm font-semibold text-slate-900">{label}</span>
                <span className="text-xs text-slate-500">{hint}</span>
              </span>
            </button>
          ))}
        </div>

        <DialogFooter className="gap-1.5">
          <Button type="button" variant="outline" size="sm" disabled={isPending} className="h-8 rounded-[2px] border-slate-300 bg-white px-3 text-xs font-normal text-slate-700 shadow-none" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" disabled={isPending} className="h-8 rounded-[2px] bg-[#ef8f00] px-3 text-xs font-normal text-slate-950 shadow-none hover:bg-[#db8300]" onClick={() => onConfirm(format)}>
            {isPending ? "Exporting..." : "Download report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
