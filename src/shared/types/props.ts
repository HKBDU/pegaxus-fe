import { type HeaderNavItem, type HeaderUser } from "./type"
import { type FooterLink } from "./type"
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
  userActions?: ReactNode
  className?: string
}

export type FooterColumnProps = {
  title: string
  links: FooterLink[]
  className?: string
  children?: ReactNode
}

export type SidebarContextProps = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

export type PageHeaderProps = {
  title: string
  backHref: string
  backLabel?: string
  showBack?: boolean
  className?: string
}

export type FieldProps = {
  label: string
  value?: string | number | null
  className?: string
  readOnly?: boolean
  error?: string
  children?: ReactNode
}
