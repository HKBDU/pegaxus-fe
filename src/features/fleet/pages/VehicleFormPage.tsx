import { useRef } from "react"
import type { UseFormReturn } from "react-hook-form"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { VehicleFormSkeleton } from "@/features/fleet/components/FleetSkeletons"
import { VehicleForm } from "@/features/fleet/components/VehicleForm"
import { PAGE_SHELL_CLASS, PAGE_WIDTH_CLASS } from "@/features/fleet/components/DetailParts"
import { VEHICLE_LIST_PATH, vehicleDetailPath } from "@/features/fleet/constants/fleet.constants"
import { useCreateVehicle, useUpdateVehicle, useVehicle } from "@/features/fleet/hooks"
import type { VehicleFormValues } from "@/features/fleet/schemas"
import { FleetApiError } from "@/features/fleet/services"
import { toVehiclePayload } from "@/features/fleet/vehicle-form"
import { getFleetErrorCode, getFleetErrorMessage } from "@/features/fleet/utils"
import { ErrorState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import { useRequestAttemptGuard } from "@/shared/hooks/useRequestAttemptGuard"

const FORM_FIELDS = new Set<string>([
  "vehicleCode",
  "vehicleName",
  "transportMode",
  "licensePlate",
  "vehicleType",
  "manufacturer",
  "model",
  "capacityHorses",
  "registrationNumber",
  "registrationExpiryDate",
  "insuranceNumber",
  "insuranceExpiryDate",
])

/** SCR-F3-025 (add, UC-44) and SCR-F3-026 (edit, UC-45). */
export default function VehicleFormPage({ mode }: { mode: "create" | "edit" }) {
  const navigate = useNavigate()
  const { vehicleId } = useParams()
  const isEdit = mode === "edit"
  const vehicleQuery = useVehicle(isEdit ? vehicleId : undefined)
  const createVehicle = useCreateVehicle()
  const updateVehicle = useUpdateVehicle()
  const attempt = useRequestAttemptGuard()
  const formRef = useRef<UseFormReturn<VehicleFormValues> | null>(null)
  const isSaving = createVehicle.isPending || updateVehicle.isPending

  const save = async (values: VehicleFormValues) => {
    const form = formRef.current
    try {
      const guarded = await attempt.run(async () => {
        const payload = toVehiclePayload(values)
        if (isEdit && vehicleQuery.data) {
          const { vehicleCode: _vehicleCode, ...rest } = payload
          await updateVehicle.mutateAsync({ id: vehicleQuery.data.vehicleId, payload: { ...rest, lastUpdatedAt: vehicleQuery.data.updatedAt } })
        } else {
          await createVehicle.mutateAsync(payload)
        }
      })
      if (!guarded.started) return
      toast.success(isEdit ? "Vehicle information updated successfully." : "Vehicle created successfully.")
      navigate(isEdit && vehicleId ? vehicleDetailPath(vehicleId) : VEHICLE_LIST_PATH)
    } catch (error) {
      attempt.reset()
      const code = getFleetErrorCode(error)
      const message = getFleetErrorMessage(error, "Unable to save this vehicle.")
      if (code === "VEHICLE_CODE_DUPLICATED") {
        form?.setError("vehicleCode", { message }, { shouldFocus: true })
        return
      }
      if (code === "LICENSE_PLATE_DUPLICATED") {
        form?.setError("licensePlate", { message }, { shouldFocus: true })
        return
      }
      if (code === "VEHICLE_MODIFIED") void vehicleQuery.refetch()
      if (code === "VALIDATION_ERROR" && error instanceof FleetApiError && error.errors?.length) {
        const unmapped: string[] = []
        for (const item of error.errors) {
          if (FORM_FIELDS.has(item.field)) form?.setError(item.field as keyof VehicleFormValues, { message: item.message })
          else unmapped.push(item.message)
        }
        if (unmapped.length) toast.error(unmapped.join(" "))
        return
      }
      toast.error(message)
    }
  }

  return (
    <div className={PAGE_SHELL_CLASS}>
      <div className={PAGE_WIDTH_CLASS}>
        <div className="mb-3">
          <PageHeader
            title={isEdit ? "EDIT VEHICLE" : "ADD NEW VEHICLE"}
            backHref={isEdit && vehicleId ? vehicleDetailPath(vehicleId) : VEHICLE_LIST_PATH}
            backLabel={isEdit ? "BACK TO VEHICLE DETAILS" : "RETURN TO VEHICLES LIST"}
          />
        </div>

        {isEdit && vehicleQuery.isLoading ? <VehicleFormSkeleton /> : null}
        {isEdit && vehicleQuery.isError ? <ErrorState message="Unable to load this vehicle." onRetry={() => void vehicleQuery.refetch()} /> : null}
        {!isEdit || vehicleQuery.data ? (
          <VehicleForm
            mode={mode}
            vehicle={vehicleQuery.data}
            isSaving={isSaving}
            cancelHref={isEdit && vehicleId ? vehicleDetailPath(vehicleId) : VEHICLE_LIST_PATH}
            onSubmit={save}
            onFormReady={(form) => {
              formRef.current = form
            }}
          />
        ) : null}
      </div>
    </div>
  )
}
