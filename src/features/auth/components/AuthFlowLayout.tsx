import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import heroPanel from "@/assets/hero-panel.png";

interface AuthFlowLayoutProps {
  title: string;
  backTo: string;
  children: ReactNode;
  footerText?: string;
}

export function AuthFlowLayout({
  title,
  backTo,
  children,
  footerText = "Remember your password?",
}: AuthFlowLayoutProps) {
  return (
    <main className="grid min-h-svh bg-[#f4f2ed] lg:grid-cols-[45%_55%]">
      <aside
        className="relative hidden min-h-svh overflow-hidden bg-[#171819] lg:block"
        aria-label="PEGAXUS Logistics"
      >
        <img
          src={heroPanel}
          alt=""
          className="size-full object-cover object-center"
        />
      </aside>
      <section className="flex min-h-svh min-w-0 flex-col px-6 py-8 sm:px-10 lg:px-[clamp(3rem,6vw,8rem)]">
        <div className="mx-auto flex w-full max-w-[700px] flex-1 flex-col justify-center py-8">
          <p className="mb-8 font-['Arial_Narrow',Impact,sans-serif] text-3xl font-bold text-[#202020] lg:hidden">
            PEGAXUS
          </p>
          <Link
            to={backTo}
            className="mb-8 inline-flex w-fit items-center gap-3 font-['Arial_Narrow',Impact,sans-serif] text-2xl font-bold text-[#202020] hover:text-[#F39200] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F39200]"
          >
            <ArrowLeft aria-hidden="true" className="size-7" /> Back
          </Link>
          <h1 className="!m-0 font-['Oswald',sans-serif] !text-4xl !leading-tight !font-bold !text-[#202020] uppercase sm:!text-5xl">
            {title}
          </h1>
          {children}
          <p className="!mt-8 text-base text-neutral-600">
            {footerText}{" "}
            <Link
              to="/login"
              className="font-semibold text-[#d47d00] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F39200]"
            >
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
