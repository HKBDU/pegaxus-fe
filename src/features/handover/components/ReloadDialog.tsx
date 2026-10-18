import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog"

/** `409 HANDOVER_MODIFIED`: someone else changed the record, so nothing may be overwritten. The only way on is to reload. */
export function ReloadDialog({ open, onReload }: { open: boolean; onReload: () => void }) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-[2px] sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading uppercase">Please reload the page</AlertDialogTitle>
          <AlertDialogDescription>This handover record was changed by someone else while you were working. Reload to see the latest version, then try again.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onReload} className="min-h-11 rounded-[2px] sm:min-h-9">
            Reload
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
