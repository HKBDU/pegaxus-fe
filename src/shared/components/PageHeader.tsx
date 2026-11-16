import { NavLink } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PageHeaderProps } from "@/shared/types/props";
import { backButtonClassName } from "./BackButton";

export function PageHeader({
  title,
  size = "default",
  backHref,
  backState,
  backLabel = "RETURN",
  onBack,
  showBack = true,
  className,
  action,
  titleAddon,
}: PageHeaderProps) {
  const titleClass = cn(
    "m-0! min-w-0 tracking-tight! [overflow-wrap:anywhere]",
    size === "compact"
      ? "font-heading text-[24px]! leading-tight! font-semibold! text-primary! uppercase sm:text-[28px]!"
      : "font-heading text-[28px]! leading-[1.15]! font-bold! text-primary! uppercase sm:text-[36px]! xl:text-[40px]!",
  );
  return (
    <section
      className={cn(
        "relative isolate flex w-full min-w-0 flex-col gap-2",
        className,
      )}
    >
      {showBack && (
        <NavLink
          to={backHref}
          state={backState}
          onClick={(event) => {
            if (onBack?.() === false) event.preventDefault();
          }}
          className={backButtonClassName}
        >
          <ArrowLeft aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="underline-offset-4 group-hover:underline">
            {backLabel}
          </span>
        </NavLink>
      )}
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        {titleAddon ? (
          // Title and addon share one group, so the addon sits right after the title text.
          <div className="flex min-w-0 flex-1 basis-full flex-wrap items-center gap-x-3 gap-y-1 sm:basis-[min(100%,12rem)]">
            <h1 className={titleClass}>{title}</h1>
            {titleAddon}
          </div>
        ) : (
          <h1 className={cn(titleClass, "flex-1 basis-full sm:basis-[min(100%,12rem)]")}>
            {title}
          </h1>
        )}
        {action}
      </div>
    </section>
  );
}
