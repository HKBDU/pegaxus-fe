import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import logo from "@/assets/Logo-black.png"
import horseCard from "@/assets/image.png"
import { ErrorState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import { Button } from "@/shared/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { HORSE_SEX_LABELS } from "../constants/horse.constants"
import { MOCK_HORSES } from "../constants/horse.mock"
import { horseApi } from "../services"
import type { Horse } from "../types"
import { getHorseApiErrorMessage } from "../utils/horse-api-error"
import { formatHorseDate } from "../utils/format-horse-date"

function DetailItem({ label, value, wide = false }: { label: string; value?: ReactNode; wide?: boolean }) {
  return (
    <div className={`flex w-full min-w-full items-baseline border-b border-slate-200/80 pb-1 sm:max-w-[190px] ${wide ? "sm:max-w-none" : ""}`}>
      <p className="line-clamp-4 w-1/2 min-w-0 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className=" line-clamp-4 w-1/2 min-w-0 break-words text-sm font-semibold leading-5 text-slate-900 sm:text-base">{value || "—"}</p>
    </div>
  )
}

function HorseDetailSkeleton() {
  return (
    <section className="profile-page w-full bg-[#f4f4f4] px-5 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-[1152px]">
        <PageHeader title="VIEW HORSE" backHref="/my-horses" />
        <div className="grid gap-4 pt-4 lg:grid-cols-2">
          {["front", "back"].map((side) => (
            <div key={side} className={`relative aspect-[20/10] w-full ${side === "back" ? "lg:ml-[40px] lg:mt-[70px]" : ""}`}>
              <div className="absolute inset-0 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
                {side === "front" && <div className="h-1.5 bg-[#f39200]" />}
                <div className={`flex gap-4 ${side === "front" ? "h-[calc(100%-6px)]" : "h-full"}`}>
                  {side === "front" && <Skeleton className="h-full w-[43%] rounded-none" />}
                  <div className="flex flex-1 flex-col gap-4 p-4 pt-5">
                    <Skeleton className="h-6 w-2/5" />
                    <Skeleton className="h-px w-12" />
                    <div className="space-y-3">
                      {Array.from({ length: side === "front" ? 5 : 4 }).map((_, index) => <Skeleton key={index} className="h-7 w-full" />)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function HorseDetailPage() {
  const { horseId } = useParams()
  const navigate = useNavigate()
  const [horse, setHorse] = useState<Horse>()
  const [error, setError] = useState<string>()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isMinimumLoadingComplete, setIsMinimumLoadingComplete] = useState(false)

  useEffect(() => {
    setIsMinimumLoadingComplete(false)
    const timeoutId = window.setTimeout(() => setIsMinimumLoadingComplete(true), 100)
    return () => window.clearTimeout(timeoutId)
  }, [horseId])

  useEffect(() => {
    if (!horseId) {
      setError("Horse was not found.")
      return
    }
    horseApi.getHorse(horseId).then(setHorse).catch((error) => {
      const mockHorse = MOCK_HORSES.find((item) => item.horseId === horseId)
      if (mockHorse) setHorse(mockHorse)
      else setError(getHorseApiErrorMessage(error, "Horse was not found."))
    })
  }, [horseId])

  if (error) return <ErrorState message={error} />
  if (!horse || !isMinimumLoadingComplete) return <HorseDetailSkeleton />
  const currentHorse = horse

  async function handleDelete() {
    if (!horseId) return

    try {
      await horseApi.removeHorse(horseId)
      toast.success(`${currentHorse.horseName} removed successfully.`)
      navigate("/my-horses")
    } catch (error) {
      setIsDeleteOpen(false)
      setError(getHorseApiErrorMessage(error, "Unable to delete horse. Please try again."))
    }
  }

  return (
    <section className="profile-page w-full bg-[#f4f4f4] px-5 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-[1152px] flex-col gap-0">
        <PageHeader title="VIEW HORSE" backHref="/my-horses" />
        <div className="flex flex-col gap-4 pt-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
          <div className="horse-card-front-enter relative w-full lg:aspect-[20/10]">
          <article className="relative z-10 min-h-0 w-full overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eef2f7_100%)] shadow-[0_22px_50px_rgba(15,23,42,0.16)] lg:absolute lg:inset-0">
            <div className="h-1.5 bg-[#f39200]" />
            <div className="relative grid h-full min-h-0 lg:grid-cols-[250px_1fr]">
              <div className="hidden lg:flex items-center justify-center border-b border-slate-200/90 bg-white lg:border-b-0 lg:border-r ">
                <img src={horseCard} alt="Horse" className="block max-h-full w-full object-contain " />
              </div>
              <div className="relative min-h-0 overflow-hidden p-3.5 sm:p-4 lg:p-4">
                <img src={logo} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 m-auto h-[72%] w-[72%] object-contain opacity-[0.035]" />
                <div className="relative">
                  <div className="mb-3 border-b border-slate-200 pb-2">
                    <p className="truncate font-heading text-2xl font-bold uppercase tracking-tight text-[#f39200]">{horse.horseName}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <DetailItem label="MICROCHIP" value={horse.microchipNumber} />
                    <DetailItem label="PASSPORT " value={horse.passportNumber} />
                    <DetailItem label="SEX" value={horse.sex ? HORSE_SEX_LABELS[horse.sex] : null} />
                    <DetailItem label="BREED" value={horse.breed} />
                    <DetailItem label="DATE OF BIRTH" value={formatHorseDate(horse.dateOfBirth)} />
                  </div>
                </div>
              </div>
            </div>
          </article>
          </div>
          <div className="horse-card-back-enter relative w-full lg:mt-[70px] lg:ml-[40px] lg:aspect-[20/10]">
          <article className="relative z-0 min-h-0  w-full overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(135deg,#eef2f7_0%,#f8fafc_42%,#ffffff_100%)] p-2.5 shadow-[0_18px_40px_rgba(15,23,42,0.11)] sm:p-3 lg:absolute lg:inset-0 lg:p-4">
            <img src={logo} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 m-auto h-[62%] w-[62%] object-contain opacity-[0.035]" />
            <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-[#f39200]/[0.08]" />
            <div className="relative grid min-w-0 grid-cols-1 gap-3">
              <DetailItem label="COLOR" value={horse.color} />
              <DetailItem label="COUNTRY OF ORIGIN" value={horse.countryOfOrigin} />
              <DetailItem label="WEIGHT (KG)" value={horse.weightKg} />
              <DetailItem label="HEIGHT (CM)" value={horse.heightCm} />
              <DetailItem wide label="IDENTIFICATION NOTES" value={horse.identificationNotes} />
            </div>
          </article>
          </div>
          <div className="flex items-center justify-end gap-2 border-[#d1d5db] pb-8 pt-3 lg:col-span-2">
            <Button type="button" variant="outline" className="h-9 rounded-none border-red-600 bg-white px-6 py-2 text-xs font-bold tracking-[0.6px] text-red-600 uppercase shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:bg-red-50 hover:text-red-700" onClick={() => setIsDeleteOpen(true)}>Delete</Button>
            <Button type="button" className="h-9 rounded-none py-2 text-xs font-bold tracking-[0.6px] uppercase shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:bg-[#f39200]" onClick={() => navigate(`/my-horses/${horse.horseId}/edit`)}>Edit</Button>
          </div>
        </div>
      </div>
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete horse?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete {horse.horseName}?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void handleDelete()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

export default HorseDetailPage
