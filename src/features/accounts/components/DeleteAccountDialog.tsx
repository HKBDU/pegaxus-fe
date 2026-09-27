import { TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle } from "@/shared/components/ui/alert-dialog"
import { useSuspendEmployee } from "../hooks/useAccounts"
import { getAccountError } from "../services"
import type { EmployeeAccount } from "../types"

export function DeleteAccountDialog({ account, onClose, onDeleted }: { account: EmployeeAccount | null; onClose: () => void; onDeleted?: () => void }) {
  const mutation = useSuspendEmployee()
  const confirm = async () => {
    if (!account || mutation.isPending) return
    try {
      await mutation.mutateAsync(account.employeeId)
      toast.success("Employee account deleted successfully.")
      onClose()
      onDeleted?.()
    } catch (error) { toast.error(getAccountError(error)) }
  }
  return (
    <AlertDialog open={Boolean(account)} onOpenChange={(open) => !open && !mutation.isPending && onClose()}>
      <AlertDialogContent className="gap-3 rounded-[2px] border-slate-200 bg-white p-4 text-slate-900 shadow-[0_14px_35px_rgba(15,23,42,0.16)] data-[size=default]:sm:max-w-[390px]">
        <AlertDialogHeader className="grid grid-rows-none grid-cols-[28px_minmax(0,1fr)] place-items-start gap-2.5 text-left">
          <AlertDialogMedia className="m-0 grid size-7 shrink-0 place-items-center rounded-[2px] bg-red-50 text-red-600"><TriangleAlert className="size-3.5" /></AlertDialogMedia>
          <div className="grid gap-0.5">
            <AlertDialogTitle className="m-0! font-heading text-base! leading-5! font-semibold! tracking-normal! text-slate-900">Delete this account?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-4 text-slate-600">Permanently suspend {account?.fullName ?? account?.employeeCode} and remove this employee from account management. Access tokens are revoked. This action cannot be undone.</AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-1.5">
          <AlertDialogCancel disabled={mutation.isPending} size="sm" className="h-8 rounded-[2px] border-slate-300 bg-white px-3 text-xs font-normal text-slate-700 shadow-none">Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={mutation.isPending} variant="destructive" size="sm" onClick={(event) => { event.preventDefault(); void confirm() }} className="h-8 rounded-[2px] bg-red-600 px-3 text-xs font-normal text-white shadow-none hover:bg-red-700">{mutation.isPending ? "Deleting..." : "Delete"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
