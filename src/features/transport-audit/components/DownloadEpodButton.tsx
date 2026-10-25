import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useEpodDownload } from "../hooks/useEpodDownload";
export function DownloadEpodButton({
  handoverRecordId,
}: {
  handoverRecordId?: string;
}) {
  const download = useEpodDownload();
  return (
    <Button
      type="button"
      variant="default"
      className="h-9 rounded-[2px] bg-[#17191c] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#34383e]"
      disabled={!handoverRecordId || download.isPending}
      onClick={() => handoverRecordId && download.mutate(handoverRecordId)}
    >
      {download.isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <FileDown className="size-4" />
      )}{" "}
      Download e-POD
    </Button>
  );
}
