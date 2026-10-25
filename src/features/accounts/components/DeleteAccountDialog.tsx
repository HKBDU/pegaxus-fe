import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";
import { useRequestAttemptGuard } from "@/shared/hooks/useRequestAttemptGuard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { useSuspendEmployee } from "../hooks/useAccounts";
import { getAccountError } from "../services";
import type { EmployeeAccount } from "../types";

export function DeleteAccountDialog({
  account,
  onClose,
  onDeleted,
}: {
  account: EmployeeAccount | null;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const mutation = useSuspendEmployee();
  const attempt = useRequestAttemptGuard();
  const { reset } = attempt;
  useEffect(() => reset(), [account?.employeeId, reset]);
  const isPending = mutation.isPending || attempt.isRunning;
  const confirm = async () => {
    if (!account) return;
    try {
      const result = await attempt.run(() =>
        mutation.mutateAsync(account.employeeId),
      );
      if (!result.started) return;
      toast.success("Employee account deleted successfully.");
      onClose();
      onDeleted?.();
    } catch (error) {
      toast.error(getAccountError(error));
    }
  };
  return (
    <AlertDialog
      open={Boolean(account)}
      onOpenChange={(open) => !open && !isPending && onClose()}
    >
      <AlertDialogContent className="gap-3 rounded-[2px] border-slate-200 bg-white p-4 text-slate-900 shadow-[0_14px_35px_rgba(15,23,42,0.16)] data-[size=default]:sm:max-w-[420px]">
        <div className="flex items-start gap-2.5 text-left">
          <span className="grid size-7 shrink-0 place-items-center rounded-[2px] bg-red-50 text-red-600">
            <TriangleAlert className="size-3.5" />
          </span>
          <div className="min-w-0 space-y-1">
            <AlertDialogTitle className="font-heading text-base leading-5 font-semibold tracking-normal text-slate-900">
              Delete employee account?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-4 text-slate-600">
              This suspends the employee account and removes it from active
              account management. It cannot be reactivated in this flow.
            </AlertDialogDescription>
          </div>
        </div>
        {account ? (
          <dl className="grid gap-1 border-y border-slate-200 py-2 text-xs">
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-slate-500">Full Name</dt>
              <dd className="min-w-0 break-words">{account.fullName || "—"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-slate-500">Employee Code</dt>
              <dd className="min-w-0 break-words">{account.employeeCode}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-slate-500">Email</dt>
              <dd className="min-w-0 break-words">{account.email}</dd>
            </div>
          </dl>
        ) : null}
        <AlertDialogFooter className="gap-1.5">
          <AlertDialogCancel
            disabled={isPending}
            size="sm"
            className="h-8 rounded-[2px] border-slate-300 bg-white px-3 text-xs font-normal text-slate-700 shadow-none"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending || attempt.isBlocked}
            variant="destructive"
            size="sm"
            onClick={(event) => {
              event.preventDefault();
              void confirm();
            }}
            className="h-8 rounded-[2px] bg-red-600 px-3 text-xs font-normal text-white shadow-none hover:bg-red-700"
          >
            {isPending
              ? "Deleting..."
              : attempt.isBlocked
                ? "Please wait..."
                : "Delete Account"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
