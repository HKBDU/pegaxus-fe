import type { ReactNode } from "react";
import { BackButton } from "@/shared/components/BackButton";

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
          <BackButton onClick={onBack} className="mb-3 sm:mb-4">
            {backLabel}
          </BackButton>
        ) : (
          <BackButton to={backTo!} className="mb-3 sm:mb-4">
            {backLabel}
          </BackButton>
        ))}
      <h1 className="!m-0 font-['Oswald',sans-serif] !text-3xl !leading-tight !font-bold !text-[#202020] uppercase sm:!text-3xl">
        {title}
      </h1>
      {children}
      {footer && <div className="mt-4 text-sm text-neutral-600">{footer}</div>}
    </div>
  );
}
