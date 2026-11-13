import { NavLink } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PageHeaderProps } from "@/shared/types/props";

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
          className="group relative z-10 inline-flex min-h-8 w-fit max-w-full items-center gap-1.5 rounded-[2px] px-1 text-xs leading-5 font-bold tracking-wide text-primary uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
