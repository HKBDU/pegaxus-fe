import { Bell, ClipboardList, CreditCard, FileText, Settings2, TriangleAlert, Truck, type LucideIcon } from "lucide-react"
import type { AppNotification, NotificationPriority } from "@/shared/realtime"

export const NOTIFICATION_TYPES = ["BOOKING", "TRANSPORT", "COMPLIANCE", "ROUTE", "PAYMENT", "SYSTEM"] as const

interface TypeMeta {
  label: string
  icon: LucideIcon
  /** Tailwind classes of the round icon tile. */
  tone: string
}

const TYPE_META: Record<string, TypeMeta> = {
  BOOKING: { label: "Booking", icon: ClipboardList, tone: "bg-indigo-50 text-indigo-600 border-indigo-100" },
  TRANSPORT: { label: "Transport", icon: Truck, tone: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  COMPLIANCE: { label: "Compliance", icon: FileText, tone: "bg-amber-50 text-amber-600 border-amber-100" },
  ROUTE: { label: "Route", icon: TriangleAlert, tone: "bg-red-50 text-red-600 border-red-100" },
  PAYMENT: { label: "Payment", icon: CreditCard, tone: "bg-purple-50 text-purple-600 border-purple-100" },
  SYSTEM: { label: "System", icon: Settings2, tone: "bg-sky-50 text-sky-600 border-sky-100" },
}
const FALLBACK_META: TypeMeta = { label: "Other", icon: Bell, tone: "bg-slate-50 text-slate-500 border-slate-200" }

export const getTypeMeta = (type: string) => TYPE_META[type] ?? FALLBACK_META

export const PRIORITY_CLASSES: Record<NotificationPriority, string> = {
  URGENT: "border-red-200 bg-red-50 text-red-600",
  HIGH: "border-orange-200 bg-orange-50 text-orange-600",
  NORMAL: "border-blue-200 bg-blue-50 text-blue-700",
  LOW: "border-slate-200 bg-slate-50 text-slate-600",
}

const REFERENCE_LABELS: Record<string, string> = {
  Booking: "Booking",
  TransportPlan: "Transport plan",
  RoutePlan: "Route plan",
  Invoice: "Invoice",
  ComplianceDossier: "Dossier",
  Vehicle: "Vehicle",
  TransportProvider: "Provider",
}

// The push carries the referenceId (a uuid) but not the human code, which is usually quoted in the message.
const CODE_PATTERN = /\b(?:REQ|TP|RP|INV|DOS|CD|RCP|VEH|PRV)-[A-Z0-9]+(?:-[A-Z0-9]+)*/

/** "Invoice INV-20261014-0435" for the "Related to" column; just the type when no code is in the message. */
export function getRelatedLabel(notification: AppNotification): string | null {
  const label = notification.referenceType ? (REFERENCE_LABELS[notification.referenceType] ?? notification.referenceType) : null
  if (!label) return null
  const code = CODE_PATTERN.exec(notification.message)?.[0]
  return code ? `${label} ${code}` : label
}

export const isUnread = (notification: AppNotification) => notification.status !== "READ"

/** 10:24 today, "Yesterday", otherwise "22 Apr 2024". */
export function formatNotificationTime(iso: string, now = new Date()) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000)
  if (days === 0) return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  if (days === 1) return "Yesterday"
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}
