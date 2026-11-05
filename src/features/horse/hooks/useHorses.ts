import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { MOCK_HORSES } from "../constants/horse.mock"
import { horseApi } from "../services"
import type { Horse } from "../types"
import { getHorseApiErrorMessage } from "../utils/horse-api-error"

export function useHorses() {
  const [horses, setHorses] = useState<Horse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()

  const loadHorses = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await horseApi.getHorses({ pageIndex: 1, pageSize: 32 })
      const allHorses = [...result.items]
      for (let pageIndex = 2; pageIndex <= result.totalPages; pageIndex += 1) {
        const page = await horseApi.getHorses({ pageIndex, pageSize: result.pageSize })
        allHorses.push(...page.items)
      }
      setHorses([...new Map(allHorses.map((horse) => [horse.horseId, horse])).values()])
      setError(undefined)
    } catch (error) {
      if (import.meta.env.DEV) {
        setHorses(MOCK_HORSES)
        setError(undefined)
      } else setError(getHorseApiErrorMessage(error, "Unable to load your horses. Please try again."))
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
    } catch (error) {
      toast.error(getHorseApiErrorMessage(error, `Unable to remove ${horse.horseName}. Please try again.`))
    }
  }, [])

  return { horses, isLoading, error, retryHorses: loadHorses, removeHorse }
}
