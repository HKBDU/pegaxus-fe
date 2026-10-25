import type { ComponentType, ReactNode } from "react"

export type HeaderNavItem = {
  label: string
  href: string
  /** Other path prefixes that belong to this item (pages reached from it, e.g. a dossier opened from a booking). */
  alsoActiveFor?: string[]
}

export type FooterLink = {
  label: string
  href: string
}

export type HeaderSidebarNavProps = {
  navItems: HeaderNavItem[]
}

export type AdminSidebarItem = {
  label: string
  href: string
  icon: ComponentType<{ className?: string }>
}

export type AdminSidebarMenuProps = {
  items: AdminSidebarItem[]
  compact?: boolean
}

export type AdminSidebarProviderProps = {
  children: ReactNode
}
