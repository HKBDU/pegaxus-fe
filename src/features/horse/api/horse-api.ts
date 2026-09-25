import apiClient from "@/lib/axios"
import type { CreateHorseRequest, HorseApiResponse, Horse, HorseListParams, HorseListValue } from "../types"

export const horseApi = {
  async getHorses(params: HorseListParams = {}) {
    const response = await apiClient.get("/horses", { params }) as unknown as HorseApiResponse<HorseListValue>
    return response.value
  },

  async getHorse(horseId: number) {
    const response = await apiClient.get(`/horses/${horseId}`) as unknown as HorseApiResponse<Horse>
    return response.value
  },

  async createHorse(input: CreateHorseRequest) {
    const response = await apiClient.post("/horses", input) as unknown as HorseApiResponse<Horse>
    return response.value
  },

  async updateHorse(horseId: number, input: CreateHorseRequest) {
    await apiClient.put(`/horses/${horseId}`, input)
  },

  async removeHorse(horseId: number) {
    await apiClient.delete(`/horses/${horseId}`)
  },
}
