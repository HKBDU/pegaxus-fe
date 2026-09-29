import { useState } from "react";
import { KeyRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { ChangePasswordForm } from "./ChangePasswordForm";

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, setPending] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={!pending}
        className="max-h-[calc(100svh-2rem)] gap-3 overflow-y-auto rounded-[2px] border-slate-200 bg-[#f5f3ef] p-4 text-[#202020] sm:max-w-md sm:p-5"
      >
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 font-heading text-xl font-bold uppercase">
            <KeyRound aria-hidden="true" className="size-5 text-[#F39200]" />
            Change password
          </DialogTitle>
          <DialogDescription className="text-sm text-neutral-600">
            Update your password to keep your account secure.
          </DialogDescription>
        </DialogHeader>
        <ChangePasswordForm
          onSuccess={() => {
            setPending(false);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
          onPendingChange={setPending}
        />
      </DialogContent>
    </Dialog>
  );
}
