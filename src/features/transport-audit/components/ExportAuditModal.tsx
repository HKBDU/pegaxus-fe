import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Progress } from "@/shared/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useAuditExportJob } from "../hooks/useAuditExportJob";
export function ExportAuditModal({
  transportId,
  open,
  onOpenChange,
}: {
  transportId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [format, setFormat] = useState<"ZIP" | "PDF">("ZIP");
  const [mode, setMode] = useState<"STANDARD" | "INSURANCE">("STANDARD");
  const exportJob = useAuditExportJob(transportId);
  const job = exportJob.job.data;
  const start = () =>
    exportJob.start(
      { format, mode },
      { onError: () => toast.error("Unable to create export package.") },
    );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export audit package</DialogTitle>
          <DialogDescription>
            Choose package format and insurance mode.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Select
            value={format}
            onValueChange={(v) => setFormat(v as "ZIP" | "PDF")}
          >
            <SelectTrigger aria-label="Export format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ZIP">ZIP</SelectItem>
              <SelectItem value="PDF">PDF</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={mode}
            onValueChange={(v) => setMode(v as "STANDARD" | "INSURANCE")}
          >
            <SelectTrigger aria-label="Export mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="STANDARD">Standard</SelectItem>
              <SelectItem value="INSURANCE">Insurance</SelectItem>
            </SelectContent>
          </Select>
          {job ? (
            <div className="space-y-2" role="status">
              <p className="text-sm font-medium">{job.status}</p>
              {job.status === "PROCESSING" || job.status === "QUEUED" ? (
                <Progress value={job.progress ?? 0} />
              ) : null}
              {job.delivery === "EMAIL" ? (
                <p className="text-sm text-amber-700">
                  Package exceeds 500MB. Download link sent to your email.
                </p>
              ) : null}
              {job.status === "READY" &&
              job.downloadUrl &&
              job.delivery !== "EMAIL" ? (
                <a
                  className="text-sm font-semibold text-primary underline"
                  href={job.downloadUrl}
                  download
                >
                  Download package
                </a>
              ) : null}
              {job.sha256 ? (
                <p className="break-all font-mono text-xs text-slate-500">
                  SHA-256: {job.sha256}
                </p>
              ) : null}
              {job.errorMessage ? (
                <p className="text-sm text-red-700">{job.errorMessage}</p>
              ) : null}
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            disabled={
              exportJob.isPending ||
              Boolean(job && ["QUEUED", "PROCESSING"].includes(job.status))
            }
            onClick={start}
          >
            Start export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
