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
import { DataTableRadioFilter } from "@/shared/components/ui/data-table-radio-filter"
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
    <>
      <DataTableRadioFilter title="Sex" value={sex} options={HORSE_SEX_OPTIONS.map((option) => ({ ...option }))} onValueChange={setSex} hideTitleWhenFiltered />
      <DataTableRadioFilter title="Breed" value={breed} options={HORSE_BREED_OPTIONS.map((option) => ({ ...option }))} onValueChange={setBreed} hideTitleWhenFiltered />
      <Select value={sort} onValueChange={setSort}>
        <SelectTrigger className="h-8 w-full rounded-[2px] border-slate-300 bg-white text-xs shadow-none data-[size=default]:h-8 focus:border-amber-500 focus:ring-amber-500/20"><SelectValue aria-label="Horse sort order" /></SelectTrigger>
        <SelectContent position="popper" align="start" sideOffset={2} className="rounded-[2px] border-slate-200 bg-white p-0.5 shadow-md">
          {HORSE_SORT_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value} className="h-7 rounded-[2px] text-xs">{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </>
  )

  return (
    <section className="profile-page w-full bg-[#f4f4f4] px-5 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-[1152px] flex-col gap-0">
        <div>
          <PageHeader title="MY HORSES" backHref="/" />
        </div>

        <div className="flex flex-col gap-[0px] pt-4">
          <HorseTable
            horses={visibleHorses}
            onAction={handleAction}
            toolbar={toolbar}
            addAction={
              <Button asChild size="sm" className="h-8 rounded-[2px] bg-[#ef8f00] px-3 font-heading text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-950 hover:bg-[#db8300]">
                <Link to="/my-horses/new">
                  <Plus className="size-3.5" />
                  Add Horse
                </Link>
              </Button>
            }
          />
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
