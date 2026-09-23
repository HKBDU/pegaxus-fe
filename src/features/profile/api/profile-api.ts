import { apiClient, type ApiResponse } from "@/lib/api-client"
import type { Profile, UpdateProfileRequest } from "../types/types"

export const profileApi = {
  async getMe() {
    const { data } = await apiClient.get<ApiResponse<Profile>>("/accounts/me")
    return data.value
  },

  async updateMe(input: UpdateProfileRequest) {
    const formData = new FormData()

    if (input.fullName !== undefined) formData.append("fullName", input.fullName)
    if (input.phone !== undefined) formData.append("phone", input.phone)
    if (input.address !== undefined) formData.append("address", input.address)
    if (input.avatar !== undefined) formData.append("avatar", input.avatar)

    const { data } = await apiClient.patch<ApiResponse<Profile>>("/accounts/me", formData)
    return data.value
  },

}
