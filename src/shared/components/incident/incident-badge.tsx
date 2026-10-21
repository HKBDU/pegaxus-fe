import { Badge } from '@/shared/components/ui/badge'
import {
  INCIDENT_CATEGORY_OPTIONS,
  INCIDENT_SEVERITY_OPTIONS,
  INCIDENT_STATUS_OPTIONS,
  EMERGENCY_COST_STATUS_OPTIONS,
} from '@/shared/constants/incident'
import type {
  EmergencyCostStatus,
  IncidentCategory,
  IncidentSeverity,
  IncidentStatus,
} from '@/shared/types/incident'

const badgeClass = 'rounded-full border px-2 py-0.5 text-xs font-medium'

const toneClass = {
  neutral: 'border-slate-300 bg-slate-50 text-slate-700',
  info: 'border-sky-200 bg-sky-50 text-sky-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-red-200 bg-red-50 text-red-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
} as const

function IncidentBadge({ label, tone }: { label: string; tone: keyof typeof toneClass }) {
  return <Badge variant="outline" className={`${badgeClass} ${toneClass[tone]}`}>{label}</Badge>
}

export function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  const option = INCIDENT_SEVERITY_OPTIONS[severity]
  return <IncidentBadge label={option.label} tone={option.tone} />
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  const option = INCIDENT_STATUS_OPTIONS[status]
  return <IncidentBadge label={option.label} tone={option.tone} />
}

export function CategoryBadge({ category }: { category: IncidentCategory }) {
  const option = INCIDENT_CATEGORY_OPTIONS[category]
  return <IncidentBadge label={option.label} tone={option.tone} />
}

export function CostStatusBadge({ status }: { status: EmergencyCostStatus }) {
  const option = EMERGENCY_COST_STATUS_OPTIONS[status]
  return <IncidentBadge label={option.label} tone={option.tone} />
}
