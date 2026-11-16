import apiClient from "@/lib/axios"
import { useAuthStore } from "@/features/auth/store"
import type { ApiResponse, Profile, UpdateProfileRequest } from "@/features/profile/types"

export const profileApi = {
  async getMe() {
    const token = useAuthStore.getState().accessToken
    if (token?.startsWith("demo-")) {
      return {
        accountId: "demo-user-01",
        email: "demo@pegaxus.com",
        fullName: "Alex Turner (Demo Lead)",
        role: "LOGISTICS_MANAGER",
        status: "ACTIVE",
        avatarUrl: null,
      } as Profile
    }
    const response = await apiClient.get("/accounts/me") as unknown as ApiResponse<Profile>
    return normalizeProfile(response.value)
  },

  async updateMe(input: UpdateProfileRequest) {
    return updateProfileRequest("/accounts/me", input)
  },

  async disableAccount(accountId: string) {
    const response = await apiClient.patch(`/accounts/${accountId}/status`, { status: "INACTIVE" }) as unknown as ApiResponse<Profile>
    return response.value
  },
}

function normalizeProfile(profile: Profile): Profile {
  return {
    ...profile,
    memberSince: profile.memberSince ?? profile.createdAt ?? null,
    dob: profile.dob ?? profile.customer?.dateOfBirth ?? null,
  }
}

async function updateProfileRequest(url: string, input: UpdateProfileRequest) {
    // The BE names the birth date `dateOfBirth` and does not change the e-mail through this endpoint.
    const { avatar, dob, email: _email, ...rest } = input
    const profileFields = { ...rest, ...(dob ? { dateOfBirth: dob.slice(0, 10) } : {}) }
    const payload = avatar && !(avatar instanceof File)
      ? { ...profileFields, avatar }
      : profileFields
    const response = await apiClient.patch(url, payload) as unknown as ApiResponse<Profile>
    return response.value
}
