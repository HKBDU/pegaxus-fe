import apiClient from "@/lib/axios"
import type { ApiResponse, Profile, UpdateProfileRequest } from "@/features/profile/types"

export const profileApi = {
  async getMe() {
    const response = await apiClient.get("/accounts/me") as unknown as ApiResponse<Profile>
    return response.value
  },

  async updateMe(input: UpdateProfileRequest) {
    const formData = new FormData()

    if (input.fullName !== undefined) formData.append("fullName", input.fullName)
    if (input.phone !== undefined) formData.append("phone", input.phone)
    if (input.address !== undefined) formData.append("address", input.address)
    if (input.avatar !== undefined) formData.append("avatar", input.avatar)

    const response = await apiClient.patch("/accounts/me", formData) as unknown as ApiResponse<Profile>
    return response.value
  },
}
