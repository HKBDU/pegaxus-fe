import { NavLink } from "react-router-dom"

import { cn } from "@/lib/utils"
import type { PageHeaderProps } from "@/shared/types/props"

export function PageHeader({ title, backHref, backLabel = "RETURN", className }: PageHeaderProps) {
  return (
    <section className={cn("flex w-full flex-col gap-0", className)}>
      <NavLink
        to={backHref}
        className="flex w-fit items-center gap-[6px] text-[12px] font-bold leading-4 tracking-[0.6px] text-primary uppercase"
      >
        <span aria-hidden="true" className="text-[14px]">←</span>
        {backLabel}
      </NavLink>
      <h1 className="!my-[10px] w-full font-[var(--heading)] text-[40px] font-bold leading-[48px] tracking-[-1.2px] !text-[hsl(var(--primary))] uppercase sm:text-[48px]">
        {title}
      </h1>
    </section>
  )
}
