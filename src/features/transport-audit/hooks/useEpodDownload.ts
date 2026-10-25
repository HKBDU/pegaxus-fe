import { useMutation } from "@tanstack/react-query";
import { transportAuditService } from "../services";
export function useEpodDownload() {
  return useMutation({
    mutationFn: async (handoverRecordId: string) => {
      const blob = await transportAuditService.downloadEpod(handoverRecordId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `e-POD-${handoverRecordId}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    },
  });
}
