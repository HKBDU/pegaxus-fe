import apiClient from "@/lib/axios"
import type { ApiResponse, Profile, UpdateProfileRequest } from "@/features/profile/types"

export const profileApi = {
  async getMe() {
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
    const formData = new FormData()

    if (input.fullName !== undefined) formData.append("FullName", input.fullName)
    if (input.email !== undefined) formData.append("Email", input.email)
    if (input.dob !== undefined) formData.append("DateOfBirth", input.dob)
    if (input.phone !== undefined) formData.append("Phone", input.phone)
    if (input.address !== undefined) formData.append("Address", input.address)
    if (input.country !== undefined) formData.append("Country", input.country)
    if (input.identityNumber !== undefined) formData.append("IdentityNumber", input.identityNumber)
    if (input.role !== undefined) formData.append("Role", input.role)
    if (input.status !== undefined) formData.append("Status", input.status)
    if (input.workStatus !== undefined) formData.append("WorkStatus", input.workStatus)
    if (input.avatar !== undefined) formData.append("Avatar", input.avatar)

    const response = await apiClient.patch(url, formData) as unknown as ApiResponse<Profile>
    return response.value
}
