import { CountrySelect } from "@/shared/components/ui/country-select"
import { Input } from "@/shared/components/ui/input"

export function ProfilePhoneEditor({ value, callingCountry, disabled, onChange, onCountryChange }: {
  value: string
  callingCountry: string
  disabled: boolean
  onChange: (value: string) => void
  onCountryChange: (value: string) => void
}) {
  return (
    <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-2">
      <label htmlFor="profile-phone-calling-country" className="text-[11px] text-[#6c6963]">Calling country (for national numbers)</label>
      <CountrySelect id="profile-phone-calling-country" value={callingCountry} onValueChange={onCountryChange} placeholder="Choose calling country" className="profile-edit-field !h-9 !min-w-0 !px-3 !py-1" />
      <Input id="profile-phone-number" type="tel" autoComplete="tel" aria-label="Phone number" aria-describedby="profile-phone-help profile-phone-preview" value={value} onChange={(event) => onChange(event.target.value)} placeholder="National number or full +number" className="profile-edit-field !h-9 !min-w-0 !px-3 !py-1" />
      <p id="profile-phone-help" className="m-0 text-[11px] leading-4 text-[#6c6963]">National numbers are supported for Vietnam, United Kingdom, France and Italy. For other countries, enter the full international number starting with +.</p>
    </fieldset>
  )
}
