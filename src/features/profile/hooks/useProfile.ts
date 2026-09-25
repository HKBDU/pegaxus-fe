import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { MOCK_EMPLOYEE_PROFILE } from "@/features/profile/constants/profile.mock"
import { profileApi } from "@/features/profile/services"
import type { Profile, UpdateProfileRequest } from "@/features/profile/types"

export function useProfile() {
  const [profile, setProfile] = useState<Profile>()
  const [error, setError] = useState<string>()
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadProfile = useCallback(async () => {
    try {
      const nextProfile = await profileApi.getMe()
      if (!nextProfile) throw new Error("Profile response is empty")
      setProfile(nextProfile)
      setError(undefined)
    } catch {
      if (import.meta.env.DEV) {
        setProfile(MOCK_EMPLOYEE_PROFILE)
        setError(undefined)
      } else {
        setError("Unable to load profile. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  async function updateProfile(input: UpdateProfileRequest) {
    setIsSubmitting(true)
    try {
      setProfile(await profileApi.updateMe(input))
      setIsEditing(false)
    } catch {
      toast.error("Can not update profile. Please try again.")
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
  }
}
