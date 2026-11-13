/**
 * Shared surface styles for the horse health screens. They mirror the web's overview panels (warm border, 2px radius,
 * soft shadow) and form controls, so the crew pages read as part of the same product instead of a separate skin.
 */
export const healthPanel =
  "rounded-xs border border-[rgb(203_196_184/0.65)] bg-white shadow-[0_1px_2px_rgb(23_25_28/0.035),0_5px_18px_rgb(63_49_27/0.025)]";

/**
 * Section heading: 14px semibold slate text with a primary-coloured icon, like `.overview-heading`. The `!`s matter:
 * index.css styles bare `h2` (24px heading font, 8px margin) outside any layer, which beats plain Tailwind utilities.
 */
export const healthHeading =
  "m-0! flex items-center gap-2 font-sans! text-sm! leading-snug! font-semibold! tracking-normal! text-slate-800! [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-primary";

export const fieldLabel = "block text-xs font-medium text-slate-600";

/** 40px on phones for touch, 36px from `sm` up, like the shared inputs. */
export const fieldControl =
  "mt-1 h-10 w-full rounded-xs border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-xs outline-none transition-colors placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus-visible:ring-red-200 sm:h-9";

/** Inline message under a field that failed validation. */
export const fieldErrorText = "mt-1 block text-[11px] font-normal text-red-600";

export const noticeMuted =
  "rounded-xs border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600";

export const noticeError =
  "rounded-xs border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700";
