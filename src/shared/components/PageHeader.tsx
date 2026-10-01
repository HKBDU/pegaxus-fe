import { NavLink } from "react-router-dom"

import { cn } from "@/lib/utils"
import type { PageHeaderProps } from "@/shared/types/props"

export function PageHeader({ title, backHref, backLabel = "RETURN", showBack = true, className, action }: PageHeaderProps) {
  return (
    <section className={cn("flex w-full flex-col gap-0", className)}>
      {showBack && <NavLink
        to={backHref}
        className="flex w-fit items-center gap-[6px] text-[12px] font-bold leading-4 tracking-[0.6px] text-primary uppercase"
      >
        <span aria-hidden="true" className="text-[14px]">←</span>
        {backLabel}
      </NavLink>}
      <div className="flex items-center justify-between gap-3">
      <h1 className="!my-[10px] min-w-0 flex-1 font-[var(--heading)] text-[40px] font-bold leading-[48px] tracking-[-1.2px] !text-[hsl(var(--primary))] uppercase sm:text-[48px]">
        {title}
      </h1>
      {action}
      </div>
    </section>
  )
}
