import { useCallback, useEffect, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { toast } from "sonner"
import { MOCK_CUSTOMER_PROFILE, MOCK_EMPLOYEE_PROFILE } from "@/features/profile/constants/profile.mock"
import { profileApi } from "@/features/profile/services"
import type { Profile, UpdateProfileRequest } from "@/features/profile/types"
import { presignedUpload } from "@/shared/utils/presigned"
import { getAvatarFileError } from "../avatar"
import { useAuthStore } from "@/features/auth/store"

export function useProfile(customerId?: string) {
  const location = useLocation()
  const sessionVersion = useAuthStore((state) => state.sessionVersion)
  const principalId = useAuthStore((state) => state.principal?.id)
  const scope = `${sessionVersion}:${principalId}:${customerId ?? "me"}:${location.pathname}`
  const scopeRef = useRef(scope)
  const mountedRef = useRef(false)
  const requestRef = useRef(0)
  const scopeGenerationRef = useRef(0)
  const submittingRef = useRef(false)
  const useMockProfile = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_PROFILE === "true"
  const [profile, setProfile] = useState<Profile>()
  const [error, setError] = useState<string>()
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    mountedRef.current = true
    scopeRef.current = scope
    submittingRef.current = false
    // oxlint-disable-next-line react/set-state-in-effect -- reset local request state for a new profile owner
    setIsSubmitting(false)
    return () => {
      mountedRef.current = false
      scopeGenerationRef.current += 1
    }
  }, [scope])

  const isCurrentScope = useCallback(() => {
    const currentSession = useAuthStore.getState()
    return mountedRef.current && scopeRef.current === scope &&
      currentSession.sessionVersion === sessionVersion && currentSession.principal?.id === principalId
  }, [scope, sessionVersion, principalId])

  const loadProfile = useCallback(async () => {
    const requestId = ++requestRef.current
    const isCurrentRequest = () => isCurrentScope() && requestRef.current === requestId
    if (!isCurrentRequest()) return
    if (useMockProfile) {
      setProfile(customerId || !location.pathname.startsWith("/admin") ? MOCK_CUSTOMER_PROFILE : MOCK_EMPLOYEE_PROFILE)
      setError(undefined)
      setIsLoading(false)
      return
    }

    try {
      if (customerId) throw new Error("Customer profile information is not available yet")
      const nextProfile = await profileApi.getMe()
      if (!isCurrentRequest()) return
      if (!nextProfile) throw new Error("Profile response is empty")
      setProfile(nextProfile)
      setError(undefined)
    } catch {
      if (!isCurrentRequest()) return
      if (import.meta.env.DEV) {
        setProfile(customerId || !location.pathname.startsWith("/admin") ? MOCK_CUSTOMER_PROFILE : MOCK_EMPLOYEE_PROFILE)
        setError(undefined)
      } else {
        setError("Unable to load profile. Please try again.")
      }
    } finally {
      if (isCurrentRequest()) setIsLoading(false)
    }
  }, [customerId, location.pathname, useMockProfile, isCurrentScope])

  async function updateProfile(input: UpdateProfileRequest): Promise<boolean> {
    if (submittingRef.current || !isCurrentScope()) return false
    const ownerGeneration = scopeGenerationRef.current
    const isCurrentUpdate = () => ownerGeneration === scopeGenerationRef.current && isCurrentScope()
    if (input.avatar instanceof File) {
      const avatarError = getAvatarFileError(input.avatar)
      if (avatarError) { toast.error(avatarError); return false }
    }
    submittingRef.current = true
    setIsSubmitting(true)
    try {
      if (useMockProfile) {
        setProfile((currentProfile) => {
          if (!currentProfile) return currentProfile

          const { avatar, ...profileFields } = input
          return {
            ...currentProfile,
            ...profileFields,
            avatarUrl: avatar instanceof File ? URL.createObjectURL(avatar) : currentProfile.avatarUrl,
            updatedAt: new Date().toISOString(),
          }
        })
        toast.success("Profile updated successfully.")
        setIsEditing(false)
        return true
      }

      if (customerId) {
        throw new Error("Customer profile updates are not available yet")
      }

      const apiInput: UpdateProfileRequest = input.avatar instanceof File
        ? {
            ...input,
            avatar: {
              publicId: await presignedUpload.upload({
                file: input.avatar,
                entity: "avatar",
              }),
            },
          }
        : input
      if (!isCurrentUpdate()) return false
      await profileApi.updateMe(apiInput)
      if (!isCurrentUpdate()) return false

      // PATCH responses may not contain the complete profile. Reload the
      // canonical representation so every field shown by the page is fresh.
      await loadProfile()
      if (!isCurrentUpdate()) return false
      toast.success("Profile updated successfully.")
      setIsEditing(false)
      return true
    } catch {
      if (isCurrentUpdate()) toast.error("Can not update profile. Please try again.")
      return false
    } finally {
      if (isCurrentUpdate()) {
        submittingRef.current = false
        setIsSubmitting(false)
      }
    }
  }

  async function disableProfile() {
    if (!profile || submittingRef.current || !isCurrentScope()) return
    const ownerGeneration = scopeGenerationRef.current
    const isCurrentUpdate = () => ownerGeneration === scopeGenerationRef.current && isCurrentScope()

    submittingRef.current = true
    setIsSubmitting(true)
    try {
      const disabledProfile = await profileApi.disableAccount(profile.accountId)
      if (isCurrentUpdate()) setProfile(disabledProfile)
    } catch {
      if (isCurrentUpdate()) toast.error("Can not disable this account. Please try again.")
    } finally {
      if (isCurrentUpdate()) {
        submittingRef.current = false
        setIsSubmitting(false)
      }
    }
  }

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- clear the previous owner's profile before loading
    setProfile(undefined)
    // oxlint-disable-next-line react/set-state-in-effect
    setIsLoading(true)
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
