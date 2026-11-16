import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link, type To } from "react-router-dom";

import { cn } from "@/lib/utils";

export const backButtonClassName =
  "group relative z-10 inline-flex min-h-8 w-fit max-w-full items-center gap-1.5 rounded-[2px] px-1 text-xs leading-5 font-bold tracking-wide text-primary uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export const backButtonLabelClassName = "underline-offset-4 group-hover:underline";

export interface BackButtonProps {
  to?: To;
  state?: unknown;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
  label?: ReactNode;
  "aria-label"?: string;
}

export function BackButton({
  to,
  state,
  onClick,
  disabled = false,
  className,
  children,
  label,
  "aria-label": ariaLabel,
}: BackButtonProps) {
  const content = (
    <>
      <ArrowLeft aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="underline-offset-4 group-hover:underline">
        {label ?? children}
      </span>
    </>
  );

  if (to && !disabled) {
    return (
      <Link
        to={to}
        state={state}
        onClick={onClick}
        aria-label={ariaLabel}
        className={cn(backButtonClassName, className)}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        backButtonClassName,
        "cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {content}
    </button>
  );
}
