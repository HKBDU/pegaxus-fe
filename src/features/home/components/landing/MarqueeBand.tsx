import { useEffect, useRef } from "react";
import logoDark from "@/assets/logo-dark.png";

/**
 * Full-bleed marquee band between Hero and Journey.
 *
 * "PEGAXUS" text alternates with the official logo.
 * - Direction: LEFT → RIGHT (CSS transform-only, seamless loop).
 * - Pauses when offscreen (IntersectionObserver).
 * - Reduced-motion: static display, animation paused.
 * - Repeated copies are `aria-hidden`; one sr-only instance provides the name.
 */
export function MarqueeBand() {
  const bandRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const band = bandRef.current;
    const track = trackRef.current;
    if (!band || !track) return;

    // Reduced-motion: keep track static.
    const reducedMq = matchMedia("(prefers-reduced-motion: reduce)");
    let onscreen = false;
    let disposed = false;
    const syncPlayback = () => {
      track.style.animationPlayState =
        !reducedMq.matches && onscreen && !document.hidden
          ? "running"
          : "paused";
    };
    syncPlayback();
    const onReducedChange = () => {
      syncPlayback();
    };
    reducedMq.addEventListener("change", onReducedChange);

    // Pause animation when offscreen for performance.
    const observer = new IntersectionObserver(
      ([entry]) => {
        onscreen = entry.isIntersecting;
        syncPlayback();
      },
      { threshold: 0 },
    );
    observer.observe(band);

    // Recompute seamless-loop width on resize/font-load.
    const recompute = () => {
      if (disposed) return;
      // Force a reflow to recalculate track dimensions after font swap.
      track.style.animation = "none";
      void track.offsetWidth;
      track.style.animation = "";
      syncPlayback();
    };
    window.addEventListener("resize", recompute);
    document.addEventListener("visibilitychange", syncPlayback);
    void document.fonts.ready.then(recompute);

    return () => {
      disposed = true;
      reducedMq.removeEventListener("change", onReducedChange);
      observer.disconnect();
      window.removeEventListener("resize", recompute);
      document.removeEventListener("visibilitychange", syncPlayback);
    };
  }, []);

  // 6 text+logo pairs gives enough content to fill wide viewports seamlessly.
  const items = Array.from({ length: 6 }, (_, i) => (
    <span className="landing-marquee-item" key={i}>
      <span className="landing-marquee-text">PEGAXUS</span>
      <img
        className="landing-marquee-logo"
        src={logoDark}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
    </span>
  ));

  return (
    <div className="landing-marquee-band" ref={bandRef} role="presentation">
      {/* Accessible name: exposed once, then all copies are decorative. */}
      <span className="sr-only">PEGAXUS</span>
      <div className="landing-marquee-track" ref={trackRef} aria-hidden="true">
        {/* Two identical loops create the seamless wrap. */}
        <div className="landing-marquee-loop">{items}</div>
        <div className="landing-marquee-loop">{items}</div>
      </div>
    </div>
  );
}
