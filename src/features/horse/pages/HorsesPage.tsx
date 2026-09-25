import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Plus } from "lucide-react"

import { ErrorState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"
import { Button } from "@/shared/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { HORSE_BREED_OPTIONS, HORSE_SEX_OPTIONS, HORSE_SORT_OPTIONS } from "../constants/horse.constants"
import { HorseTable } from "../components"
import { useHorses } from "../hooks/useHorses"
import type { Horse, HorseTableAction } from "../types"

export function HorsesPage() {
  const { horses, isLoading, error, retryHorses, removeHorse } = useHorses()
  const navigate = useNavigate()
  const [sex, setSex] = useState("ALL")
  const [breed, setBreed] = useState("ALL")
  const [sort, setSort] = useState("newest")
  const [pendingRemoval, setPendingRemoval] = useState<Horse>()

  const visibleHorses = useMemo(() => {
    return horses
      .filter(
        (horse) =>
          (sex === "ALL" || horse.sex === sex) &&
          (breed === "ALL" || horse.breed === breed),
      )
      .sort((a, b) => {
        if (sort === "name") return a.horseName.localeCompare(b.horseName)
        return sort === "oldest" ? a.horseId.localeCompare(b.horseId) : 0
      })
  }, [horses, sex, breed, sort])

  function handleAction(horse: Horse, action: HorseTableAction) {
    if (action === "remove") return setPendingRemoval(horse)
    if (action === "edit") return navigate(`/my-horses/${horse.horseId}/edit`)
    if (action === "view") return navigate(`/my-horses/${horse.horseId}`)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-muted-foreground">
        Loading horses...
      </div>
    )
  }

  if (error) return <ErrorState message={error} onRetry={retryHorses} />

  const toolbar = (
    <div className="flex flex-1 flex-col gap-3 sm:flex-row">
      <Select value={sex} onValueChange={setSex}>
        <SelectTrigger className="w-full rounded-[2px] border-[hsl(var(--input))] bg-transparent sm:w-[185px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="horse-select-content">
          {HORSE_SEX_OPTIONS.map((option) => (
            <SelectItem className="horse-select-item" key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={breed} onValueChange={setBreed}>
        <SelectTrigger className="w-full rounded-[2px] border-[hsl(var(--input))] bg-transparent sm:w-[185px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="horse-select-content">
          {HORSE_BREED_OPTIONS.map((option) => (
            <SelectItem className="horse-select-item" key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sort} onValueChange={setSort}>
        <SelectTrigger className="w-full rounded-[2px] border-[hsl(var(--input))] bg-transparent sm:w-[185px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="horse-select-content">
          {HORSE_SORT_OPTIONS.map((option) => (
            <SelectItem className="horse-select-item" key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <section className="profile-page w-full bg-[#f4f4f4] px-5 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-[1152px] flex-col gap-0">
        <div className="relative">
          <PageHeader title="MY HORSES" backHref="/" />
          <Button
            asChild
            className="absolute right-0 top-[36px] h-11 rounded-[2px] px-6 font-bold uppercase tracking-wide"
          >
            <Link to="/my-horses/new">
              <Plus />
              Add Horse
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-[0px] pt-4">
          <HorseTable horses={visibleHorses} onAction={handleAction} toolbar={toolbar} />
          <p className="mt-7 text-sm text-muted-foreground">
            Showing 1 to {Math.min(6, visibleHorses.length)} of {visibleHorses.length} entries
          </p>
        </div>

        <AlertDialog
          open={Boolean(pendingRemoval)}
          onOpenChange={(open) => !open && setPendingRemoval(undefined)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove horse?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {pendingRemoval?.horseName} from your
                registered horses?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  if (pendingRemoval) void removeHorse(pendingRemoval)
                  setPendingRemoval(undefined)
                }}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  )
}

export default HorsesPage
