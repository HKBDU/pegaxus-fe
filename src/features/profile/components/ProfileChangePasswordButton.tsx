import { KeyRound } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export function ProfileChangePasswordButton({
  customerId,
  authenticated,
  disabled,
  onClick,
}: {
  customerId?: string;
  authenticated: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  if (!authenticated || customerId) return null;

  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      onClick={onClick}
      className="rounded-[2px] border-slate-300 bg-white text-slate-900 shadow-sm transition-colors hover:border-[#F39200] hover:bg-amber-50 hover:text-slate-900 focus-visible:ring-[#F39200]/30"
    >
      <KeyRound aria-hidden="true" />
      CHANGE PASSWORD
    </Button>
  );
}
