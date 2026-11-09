import { Link } from "react-router-dom";
import { FileCheck, Loader2, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import type { Booking } from "../types";
import type { BookingDossierLink } from "@/features/dossier/schemas";
import {
  getBookingActionAvailability,
  type BookingActionStatus,
} from "../lib/booking-actions";

const actionButtonClass =
  "inline-flex h-8 items-center justify-center whitespace-nowrap rounded-[2px] border px-4 font-heading text-[11px] font-semibold uppercase tracking-[0.04em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const outlineButtonClass = "border-gray-900 bg-white text-gray-900 hover:bg-gray-100";
const disabledButtonClass =
  "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-80 shadow-none";

interface BookingCardActionsProps {
  booking: Booking;
  dossiers?: BookingDossierLink[] | null;
  dossierLoading?: boolean;
  dossierError?: boolean;
}

export function BookingCardActions({
  booking,
  dossiers,
  dossierLoading,
  dossierError,
}: BookingCardActionsProps) {
  const { transport, dossier } = getBookingActionAvailability({
    booking,
    dossiers,
    dossierLoading,
    dossierError,
  });

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-wrap items-center gap-2">
        <ActionButtonItem
          label="Transport Tracking"
          action={transport}
          icon={<Truck className="mr-1.5 size-3.5" />}
        />
        <ActionButtonItem
          label="Compliance Dossier"
          action={dossier}
          icon={<FileCheck className="mr-1.5 size-3.5" />}
        />
      </div>
    </TooltipProvider>
  );
}

function ActionButtonItem({
  label,
  action,
  icon,
}: {
  label: string;
  action: BookingActionStatus;
  icon?: React.ReactNode;
}) {
  if (action.enabled && action.href) {
    return (
      <Link
        to={action.href}
        className={cn(actionButtonClass, outlineButtonClass)}
      >
        {icon}
        {label}
      </Link>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-block cursor-not-allowed">
          <Button
            type="button"
            disabled
            variant="outline"
            className={cn(actionButtonClass, disabledButtonClass)}
          >
            {action.loading ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              icon
            )}
            {label}
          </Button>
        </span>
      </TooltipTrigger>
      {action.reason ? (
        <TooltipContent side="bottom" className="text-xs">
          <p>{action.reason}</p>
        </TooltipContent>
      ) : null}
    </Tooltip>
  );
}

