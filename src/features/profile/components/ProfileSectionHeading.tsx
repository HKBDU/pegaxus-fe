import { cn } from "@/lib/utils"

import { PROFILE_SECTION_TITLES } from "../constants/profile.constants"
import type { ProfileSectionHeadingProps } from "../types"

export function ProfileSectionHeading({ title, className }: ProfileSectionHeadingProps) {
  return (
    <h2 className={cn("font-bold text-[24px] leading-8 tracking-[0.6px] uppercase", className)}>
      {PROFILE_SECTION_TITLES[title]}
    </h2>
  )
}
