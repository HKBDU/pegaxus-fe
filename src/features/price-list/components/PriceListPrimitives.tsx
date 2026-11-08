/** Same flat look as the claim and booking pages: white panels, thin warm border. */
export const panelClass = "border border-[#e5e2d9] bg-white"
export const fieldLabelClass = "mb-1 block font-heading text-[11px] font-medium uppercase leading-4 tracking-[0.04em] text-[#181818]"
export const controlClass =
  "h-8 w-full rounded-[2px] border-[#f3aa3b] bg-transparent px-3 text-xs text-[#181818] shadow-none md:text-xs placeholder:text-[#6c6963] focus-visible:border-primary focus-visible:ring-primary/20 disabled:bg-gray-50 disabled:text-gray-500"
const buttonBase = "h-8 rounded-[2px] border px-4 font-heading text-[11px] font-semibold uppercase tracking-[0.04em] transition-colors"
export const outlineButtonClass = `${buttonBase} border-gray-900 bg-white text-gray-900 hover:bg-gray-100`
export const primaryButtonClass = `${buttonBase} border-primary bg-primary text-gray-900 hover:border-primary-hover hover:bg-primary-hover`

export function FieldError({ message }: { message?: string }) {
  return message ? (
    <p className="mt-1 text-[11px] text-red-600" role="alert">
      {message}
    </p>
  ) : null
}
