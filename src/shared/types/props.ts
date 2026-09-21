import { type HeaderNavItem, type HeaderUser } from "./type"
import type { ReactNode } from "react"

export type ActionDialogProps = {
  open: boolean,
  onOpenChange: (open: boolean) => void,
  title: string,
  description: string | null,
  primaryButtonText: string | null,
  destructiveButtonText: string | null
}

export type HeaderProps = {
  navItems?: HeaderNavItem[]
  logoSrc?: string
  logoAlt?: string
  user?: HeaderUser
  notificationCount?: number
  onNotificationClick?: () => void
  onUserClick?: () => void
  rightContent?: ReactNode
  className?: string
}
