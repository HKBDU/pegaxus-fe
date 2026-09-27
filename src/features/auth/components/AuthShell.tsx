import { Suspense, useContext, useEffect, useState } from "react";
import {
  UNSAFE_LocationContext,
  useLocation,
  useOutlet,
} from "react-router-dom";
import heroPanel from "@/assets/hero-panel1.png";
import logoBlack from "@/assets/Logo-black.png";
import "../auth.css";

export function AuthShell() {
  const outlet = useOutlet();
  const location = useLocation();
  const locationContext = useContext(UNSAFE_LocationContext);
  const [displayed, setDisplayed] = useState(() => ({
    outlet,
    locationContext,
    key: location.key,
    initial: true,
  }));
  const exiting = displayed.key !== location.key;

  useEffect(() => {
    if (displayed.key === location.key) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = window.setTimeout(
      () => {
        setDisplayed({
          outlet,
          locationContext,
          key: location.key,
          initial: false,
        });
      },
      reduced ? 0 : 180,
    );
    return () => window.clearTimeout(timer);
  }, [displayed.key, location.key, outlet, locationContext]);

  return (
    <main className="auth-shell grid min-h-svh bg-[#f4f2ed] lg:h-svh lg:grid-cols-[45%_55%]">
      <aside className="relative hidden h-svh overflow-hidden bg-[#171819] lg:block">
        <img
          src={heroPanel}
          alt=""
          className="auth-hero absolute inset-0 size-full object-cover"
        />
        <div className="auth-overlay absolute inset-0 bg-black/40" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center">
          <h1 className="auth-wordmark text-6xl font-bold !text-white">
            PEGAXUS
          </h1>
          <div className="auth-accent mt-4 h-0.5 w-24 bg-[#F29100]" />
        </div>
        <p className="auth-copyright absolute bottom-6 left-0 right-0 z-10 text-center text-xs text-white/50">
          © 2026 PEGAXUS LOGISTICS GROUP
        </p>
      </aside>
      <section className="flex min-h-svh min-w-0 flex-col px-6 py-4 sm:px-10 sm:py-6 lg:h-svh lg:min-h-0 lg:px-[clamp(3rem,6vw,8rem)] lg:py-2">
        <div className="mx-auto flex w-full max-w-[600px] flex-1 flex-col justify-center py-2 lg:py-0">
          <div className="mb-5 flex justify-center sm:mb-6 lg:hidden">
            <img
              src={logoBlack}
              alt="PEGAXUS"
              className="auth-wordmark h-auto w-[clamp(7rem,24vw,9rem)] object-contain"
            />
          </div>
          <div
            key={displayed.key}
            className={`auth-content ${exiting ? "auth-exit" : displayed.initial ? "auth-initial" : "auth-enter"}`}
            inert={exiting}
          >
            <UNSAFE_LocationContext.Provider value={displayed.locationContext}>
              <Suspense
                fallback={
                  <p role="status" className="text-neutral-600">
                    Loading form…
                  </p>
                }
              >
                {displayed.outlet}
              </Suspense>
            </UNSAFE_LocationContext.Provider>
          </div>
        </div>
      </section>
    </main>
  );
}
