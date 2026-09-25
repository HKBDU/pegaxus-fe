import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { MOCK_HORSES } from "../constants/horse.mock"
import { horseApi } from "../services"
import type { Horse } from "../types"

export function useHorses() {
  const [horses, setHorses] = useState<Horse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()

  const loadHorses = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await horseApi.getHorses({ pageIndex: 1, pageSize: 32 })
      setHorses(result.items)
      setError(undefined)
    } catch {
      if (import.meta.env.DEV) {
        setHorses(MOCK_HORSES)
        setError(undefined)
      } else setError("Unable to load your horses. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- load remote horse data on mount
    void loadHorses()
  }, [loadHorses])

  const removeHorse = useCallback(async (horse: Horse) => {
    try {
      await horseApi.removeHorse(horse.horseId)
      setHorses((current) => current.filter((item) => item.horseId !== horse.horseId))
      toast.success(`${horse.horseName} removed successfully.`)
    } catch {
      if (import.meta.env.DEV) {
        setHorses((current) => current.filter((item) => item.horseId !== horse.horseId))
        toast.success(`${horse.horseName} removed successfully.`)
        return
      }
      toast.error("Unable to remove horse. Please try again.")
    }
  }, [])

  return { horses, isLoading, error, retryHorses: loadHorses, removeHorse }
}
