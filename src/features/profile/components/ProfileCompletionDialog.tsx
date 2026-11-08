import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { AlertTriangle } from "lucide-react"

import { useAuthStore } from "@/features/auth/store"
import { profileApi } from "@/features/profile/services"
import type { Profile } from "@/features/profile/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"

export function ProfileCompletionDialog() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const accessToken = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  const role = user?.role

  const [open, setOpen] = useState(false)
  const [missingFields, setMissingFields] = useState<string[]>([])

  useEffect(() => {
    // Only check for logged-in CUSTOMER accounts when not currently on the profile settings page
    if (!accessToken || !user?.accountId || role !== "CUSTOMER" || pathname === "/profile-settings") {
      return
    }

    const storageKey = `profile_reminder_dismissed_${user.accountId}`
    // Already shown or dismissed in this login session
    if (sessionStorage.getItem(storageKey) === "true") {
      return
    }

    let isMounted = true
    profileApi
      .getMe()
      .then((profile: Profile) => {
        if (!isMounted) return

        const missing: string[] = []
        if (!profile.fullName?.trim()) {
          missing.push("Full Name")
        }
        if (!profile.phone?.trim()) {
          missing.push("Phone Number")
        }
        if (!profile.address?.trim()) {
          missing.push("Address")
        }

        // Only open dialog if there are missing required fields
        if (missing.length > 0) {
          setMissingFields(missing)
          setOpen(true)
        } else {
          // Profile is complete, mark as checked for this session
          sessionStorage.setItem(storageKey, "true")
        }
      })
      .catch(() => {
        // Silently ignore network failures to avoid blocking user workflows
      })

    return () => {
      isMounted = false
    }
  }, [accessToken, user?.accountId, role, pathname])

  const handleDismiss = () => {
    if (user?.accountId) {
      sessionStorage.setItem(`profile_reminder_dismissed_${user.accountId}`, "true")
    }
    setOpen(false)
  }

  const handleUpdate = () => {
    handleDismiss()
    navigate("/profile-settings")
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleDismiss()
      }}
    >
      <AlertDialogContent className="max-w-md rounded-[2px]">
        <AlertDialogHeader>
          <div className="mb-1 flex items-center gap-2 text-amber-600">
            <AlertTriangle className="size-5 shrink-0" />
            <span className="font-heading text-xs font-semibold uppercase tracking-wider">
              Profile Notice
            </span>
          </div>
          <AlertDialogTitle className="text-base font-semibold text-slate-900">
            Complete your profile
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs leading-relaxed text-slate-600">
            Some services (such as transport booking, quarantine dossier processing, and trip notifications) may be unavailable because your profile information is incomplete.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {missingFields.length > 0 && (
          <div className="my-1 rounded-[2px] border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-950">
            <p className="mb-1 font-semibold">Missing required details:</p>
            <ul className="list-inside list-disc space-y-0.5 text-slate-700">
              {missingFields.map((field) => (
                <li key={field} className="font-medium text-amber-900">
                  {field}
                </li>
              ))}
            </ul>
          </div>
        )}

        <AlertDialogFooter className="mt-4 gap-2 sm:justify-end">
          <AlertDialogCancel
            className="rounded-[2px] border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            onClick={handleDismiss}
          >
            Later
          </AlertDialogCancel>
          <AlertDialogAction
            className="rounded-[2px] bg-[#F39200] font-medium text-slate-950 hover:bg-[#d98200]"
            onClick={handleUpdate}
          >
            Update Profile
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
