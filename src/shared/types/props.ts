import { type HeaderNavItem } from "./type"
import { type FooterLink } from "./type"
import type { ReactNode } from "react"
import type { ProfileDropdownUser } from "@/shared/components/ProfileDropdown"

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
  isLoggedIn?: boolean
  user?: ProfileDropdownUser | null
  notificationCount?: number
  onNotificationClick?: () => void
  rightContent?: ReactNode
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
  /** Rendered on the same row as the title, at the end (e.g. a "New" button on mobile). */
  action?: ReactNode
}

export type FieldProps = {
  label: string
  value?: string | number | null
  className?: string
  readOnly?: boolean
  error?: string
  characterCount?: { value: number; max: number }
  children?: ReactNode
}
