import apiClient from "@/lib/axios"
import type { CreateHorseRequest, HorseApiResponse, Horse, HorseListParams, HorseListValue } from "../types"

function unwrap<T>(response: HorseApiResponse<T>) {
  if (!response.isSuccess) throw new Error(response.message || "Horse request failed")
  return response.value
}

export const horseApi = {
  async getHorses(params: HorseListParams = {}) {
    const response = await apiClient.get("/horses", { params }) as unknown as HorseApiResponse<HorseListValue>
    return unwrap(response)
  },

  async getHorse(horseId: string) {
    const response = await apiClient.get(`/horses/${horseId}`) as unknown as HorseApiResponse<Horse>
    return unwrap(response)
  },

  async createHorse(input: CreateHorseRequest) {
    const response = await apiClient.post("/horses", input) as unknown as HorseApiResponse<Horse>
    return unwrap(response)
  },

  async updateHorse(horseId: string, input: CreateHorseRequest) {
    const response = await apiClient.put(`/horses/${horseId}`, input) as unknown as HorseApiResponse<unknown>
    unwrap(response)
  },

  async removeHorse(horseId: string) {
    const response = await apiClient.delete(`/horses/${horseId}`) as unknown as HorseApiResponse<unknown> | undefined
    if (response) unwrap(response)
  },

}
