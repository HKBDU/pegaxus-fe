import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import heroPanel from "@/assets/hero-panel1.png";
import logoBlack from "@/assets/Logo-black.png";

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
    <main className="grid min-h-svh bg-[#f4f2ed] lg:h-svh lg:grid-cols-[45%_55%]">
      <aside className="relative hidden h-svh overflow-hidden bg-[#171819] lg:block">
        <img
          src={heroPanel}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />{" "}
        <div className="relative z-10 flex h-full flex-col items-center justify-center">
          <h1 className="text-6xl font-bold !text-white">PEGAXUS</h1>
          <div className="mt-4 h-0.5 w-24 bg-[#F29100]" />
        </div>
        <p className="absolute bottom-6 left-0 right-0 z-10 text-center text-xs text-white/50">
          © 2026 PEGAXUS LOGISTICS GROUP
        </p>
      </aside>
      <section className="flex min-h-svh min-w-0 flex-col px-6 py-4 sm:px-10 sm:py-6 lg:h-svh lg:min-h-0 lg:px-[clamp(3rem,6vw,8rem)] lg:py-2">
        <div className="mx-auto flex w-full max-w-[600px] flex-1 flex-col justify-center py-2 lg:py-0">
          <div className="mb-5 flex justify-center sm:mb-6 lg:hidden">
            <img
              src={logoBlack}
              alt="PEGAXUS"
              className="h-auto w-[clamp(7rem,24vw,9rem)] object-contain"
            />
          </div>

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
          {footer && (
            <div className="mt-4 text-sm text-neutral-600">{footer}</div>
          )}
        </div>
      </section>
    </main>
  );
}
