import { cn } from "@/lib/utils"

import type { ProfileSectionDividerProps } from "../types/props"

export function ProfileSectionDivider({ className }: ProfileSectionDividerProps) {
  return <div aria-hidden="true" className={cn("h-px w-full bg-[#d1d5db]", className)} />
}
