import { QUOTATION_BANNER_TEXT } from '@/shared/constants/invoice'

export function QuotationBanner() {
  return (
    <div className="rounded-[2px] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">
      {QUOTATION_BANNER_TEXT}
    </div>
  )
}
