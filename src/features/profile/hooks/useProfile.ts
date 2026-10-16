import { useCallback, useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import { toast } from "sonner"
import { MOCK_CUSTOMER_PROFILE, MOCK_EMPLOYEE_PROFILE } from "@/features/profile/constants/profile.mock"
import { profileApi } from "@/features/profile/services"
import type { Profile, UpdateProfileRequest } from "@/features/profile/types"

export function useProfile(customerId?: string) {
  const location = useLocation()
  const useMockProfile = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_PROFILE === "true"
  const [profile, setProfile] = useState<Profile>()
  const [error, setError] = useState<string>()
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadProfile = useCallback(async () => {
    if (useMockProfile) {
      setProfile(customerId || !location.pathname.startsWith("/admin") ? MOCK_CUSTOMER_PROFILE : MOCK_EMPLOYEE_PROFILE)
      setError(undefined)
      setIsLoading(false)
      return
    }

    try {
      if (customerId) throw new Error("Backend does not expose a customer profile endpoint")
      const nextProfile = await profileApi.getMe()
      if (!nextProfile) throw new Error("Profile response is empty")
      setProfile(nextProfile)
      setError(undefined)
    } catch {
      if (import.meta.env.DEV) {
        setProfile(customerId || !location.pathname.startsWith("/admin") ? MOCK_CUSTOMER_PROFILE : MOCK_EMPLOYEE_PROFILE)
        setError(undefined)
      } else {
        setError("Unable to load profile. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }, [customerId, location.pathname, useMockProfile])

  async function updateProfile(input: UpdateProfileRequest): Promise<boolean> {
    setIsSubmitting(true)
    try {
      if (useMockProfile) {
        setProfile((currentProfile) => {
          if (!currentProfile) return currentProfile

          const { avatar, ...profileFields } = input
          return {
            ...currentProfile,
            ...profileFields,
            avatarUrl: avatar ? URL.createObjectURL(avatar) : currentProfile.avatarUrl,
            updatedAt: new Date().toISOString(),
          }
        })
        toast.success("Profile updated successfully.")
        setIsEditing(false)
        return true
      }

      if (customerId) {
        throw new Error("Backend does not expose a customer profile update endpoint")
      }

      await profileApi.updateMe(input)

      // PATCH responses may not contain the complete profile. Reload the
      // canonical representation so every field shown by the page is fresh.
      await loadProfile()
      toast.success("Profile updated successfully.")
      setIsEditing(false)
      return true
    } catch {
      toast.error("Can not update profile. Please try again.")
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  async function disableProfile() {
    if (!profile) return

    setIsSubmitting(true)
    try {
      setProfile(await profileApi.disableAccount(profile.accountId))
    } catch {
      toast.error("Can not disable this account. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- synchronize local state with the profile API
    void loadProfile()
  }, [loadProfile])

  const retryProfile = useCallback(() => {
    setIsLoading(true)
    void loadProfile()
  }, [loadProfile])

  return {
    profile,
    error,
    isLoading,
    isEditing,
    isSubmitting,
    setIsEditing,
    retryProfile,
    updateProfile,
    disableProfile,
  }
}
