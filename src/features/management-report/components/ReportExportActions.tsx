import { Download } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import type { ExportFormat } from "../schemas";

export function ReportExportActions({
  pending,
  disabled,
  onExport,
}: {
  pending: ExportFormat | null;
  disabled: boolean;
  onExport: (format: ExportFormat) => void;
}) {
  return (
    <div className="flex max-w-full flex-wrap gap-2">
      {(["xlsx", "pdf"] as const).map((format) => (
        <Button
          type="button"
          key={format}
          variant="outline"
          disabled={disabled}
          onClick={() => onExport(format)}
          className="h-9 rounded-[2px]"
        >
          <Download aria-hidden="true" className="size-4" />
          {pending === format
            ? "Exporting…"
            : format === "xlsx"
              ? "Export XLSX"
              : "Export PDF"}
        </Button>
      ))}
    </div>
  );
}
