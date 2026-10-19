import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import "../auth.css";

interface PasswordFieldProps extends Omit<
  ComponentProps<typeof Input>,
  "type"
> {
  visibilityLabel: string;
}

export function PasswordField({
  className,
  visibilityLabel,
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("auth-password pr-12", className)}
      />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`${visible ? "Hide" : "Show"} ${visibilityLabel}`}
              aria-pressed={visible}
              disabled={props.disabled}
              onClick={() => setVisible((current) => !current)}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-neutral-600 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#F39200]"
            >
              {visible ? (
                <EyeOff aria-hidden="true" className="size-5" />
              ) : (
                <Eye aria-hidden="true" className="size-5" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="rounded-[2px] px-2 py-1 shadow-md"
          >
            {visible ? "Hide" : "Show"} {visibilityLabel}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
