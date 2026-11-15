import type { ReactNode } from "react";
import { Link, type To } from "react-router-dom";
import { cn } from "@/lib/utils";

export const codeLinkClassName =
  "inline-flex min-h-8 max-w-full items-center rounded-[2px] py-1 font-semibold text-slate-900 underline decoration-primary/40 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary focus-visible:text-primary focus-visible:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none";

export const referenceCodeClassName =
  "inline-flex min-h-8 max-w-full items-center py-1 font-normal text-slate-700 no-underline hover:no-underline hover:text-slate-700 cursor-default focus-visible:outline-2 focus-visible:outline-primary focus-visible:no-underline";

export interface CodeLinkProps {
  to?: To;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  className?: string;
  children: ReactNode;
  title?: string;
  state?: unknown;
  variant?: "primary" | "reference";
}

export function CodeLink({
  to,
  onClick,
  className,
  children,
  title,
  state,
  variant = "reference",
}: CodeLinkProps) {
  const isPrimary = variant === "primary";
  const baseClassName = isPrimary ? codeLinkClassName : referenceCodeClassName;

  if (to) {
    return (
      <Link
        to={to}
        state={state}
        onClick={onClick}
        title={title}
        className={cn(baseClassName, className)}
      >
        {children}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        className={cn(baseClassName, isPrimary ? "cursor-pointer" : "cursor-default", className)}
      >
        {children}
      </button>
    );
  }

  return (
    <span title={title} className={cn(baseClassName, className)}>
      {children}
    </span>
  );
}
