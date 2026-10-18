import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface AuthFlowLayoutProps {
  title: string;
  children: ReactNode;
  backTo?: string;
  onBack?: () => void;
  backLabel?: string;
  footer?: ReactNode;
}

export function AuthFlowLayout({
  title,
  children,
  backTo,
  onBack,
  backLabel = "Back",
  footer,
}: AuthFlowLayoutProps) {
  return (
    <div className="auth-form-content">
      {(backTo || onBack) &&
        (onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="mb-3 inline-flex w-fit items-center gap-2 font-['Arial_Narrow',Impact,sans-serif] text-lg font-bold text-[#202020] hover:text-[#F39200] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F39200] sm:mb-4 sm:text-xl"
          >
            <ArrowLeft aria-hidden="true" className="size-5 sm:size-6" />
            {backLabel}
          </button>
        ) : (
          <Link
            to={backTo!}
            className="mb-3 inline-flex w-fit items-center gap-2 font-['Arial_Narrow',Impact,sans-serif] text-lg font-bold text-[#202020] hover:text-[#F39200] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F39200] sm:mb-4 sm:text-xl"
          >
            <ArrowLeft aria-hidden="true" className="size-5 sm:size-6" />
            {backLabel}
          </Link>
        ))}
      <h1 className="!m-0 font-['Oswald',sans-serif] !text-3xl !leading-tight !font-bold !text-[#202020] uppercase sm:!text-3xl">
        {title}
      </h1>
      {children}
      {footer && <div className="mt-4 text-sm text-neutral-600">{footer}</div>}
    </div>
  );
}
