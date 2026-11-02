import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";
import type { PageHeaderProps } from "@/shared/types/props";

export function PageHeader({
  title,
  backHref,
  backLabel = "RETURN",
  onBack,
  showBack = true,
  className,
  action,
}: PageHeaderProps) {
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
          onClick={(event) => {
            if (onBack?.() === false) event.preventDefault();
          }}
          className="relative z-10 inline-flex min-h-8 w-fit max-w-full items-center gap-1.5 rounded-[2px] px-1 text-xs leading-5 font-bold tracking-wide text-primary uppercase underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span aria-hidden="true" className="text-[14px]">
            ←
          </span>
          {backLabel}
        </NavLink>
      )}
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <h1 className="m-0! min-w-0 flex-1 basis-full font-heading text-[28px]! leading-[1.15]! font-bold! tracking-tight! text-primary! uppercase [overflow-wrap:anywhere] sm:basis-[min(100%,12rem)] sm:text-[36px]! xl:text-[40px]!">
          {title}
        </h1>
        {action}
      </div>
    </section>
  );
}
