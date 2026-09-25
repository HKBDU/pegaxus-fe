import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { ErrorState } from "@/shared/components/common"
import { HorseFormPage } from "./AddHorsePage"
import { MOCK_HORSES } from "../constants/horse.mock"
import { horseApi } from "../services"
import type { Horse } from "../types"

export function EditHorsePage() {
  const { horseId } = useParams()
  const [horse, setHorse] = useState<Horse>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    const id = Number(horseId)
    if (!Number.isFinite(id)) {
      setError("Horse was not found.")
      return
    }
    horseApi.getHorse(id).then(setHorse).catch(() => {
      const mockHorse = MOCK_HORSES.find((item) => item.horseId === id)
      if (mockHorse) setHorse(mockHorse)
      else setError("Horse was not found.")
    })
  }, [horseId])

  if (error) return <ErrorState message={error} />
  if (!horse) return <div className="flex min-h-[420px] items-center justify-center text-muted-foreground">Loading horse...</div>
  return <HorseFormPage mode="edit" initialHorse={horse} />
}

export default EditHorsePage
