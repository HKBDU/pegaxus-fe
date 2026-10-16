import { CircleAlert, CircleCheck } from "lucide-react"

import { Badge } from "@/shared/components/ui/badge"

import { EMAIL_VERIFICATION_LABELS } from "../constants/profile.constants"
import type { ProfileVerificationFieldProps } from "../types"

export function ProfileVerificationField({ status, className }: ProfileVerificationFieldProps) {
  const isVerified = status === "VERIFIED"
  const Icon = isVerified ? CircleCheck : CircleAlert

  return (
    <Badge
      variant={isVerified ? "default" : "destructive"}
      aria-label={`Email verification status: ${EMAIL_VERIFICATION_LABELS[status]}`}
      className={className}
    >
      <Icon className="size-3" aria-hidden="true" />
      {EMAIL_VERIFICATION_LABELS[status]}
    </Badge>
  )
}
