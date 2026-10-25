import { useCallback, useEffect, useRef, useState } from "react";

export function HorseLoader({
  pending,
  onReveal,
}: {
  pending: boolean;
  onReveal: () => void;
}) {
  const [expired, setExpired] = useState(false);
  const revealed = useRef(false);
  const opening = !pending || expired;
  const reveal = useCallback(() => {
    if (revealed.current) return;
    revealed.current = true;
    onReveal();
  }, [onReveal]);
  useEffect(() => {
    if (!pending) return;
    const timeout = window.setTimeout(() => setExpired(true), 12000);
    return () => window.clearTimeout(timeout);
  }, [pending]);
  useEffect(() => {
    if (!opening) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      if (reduced.matches) reveal();
    };
    update();
    // A bounded exit also covers missing transitionend events or a suspended tab.
    const timeout = window.setTimeout(reveal, 1100);
    reduced.addEventListener("change", update);
    return () => {
      window.clearTimeout(timeout);
      reduced.removeEventListener("change", update);
    };
  }, [opening, reveal]);
  return (
    <div
      className={`landing-loader${opening ? " is-loaded" : ""}`}
      role="status"
      aria-live="polite"
      aria-hidden={opening}
      onTransitionEnd={(event) => {
        if (
          opening &&
          event.propertyName === "transform" &&
          event.target instanceof HTMLElement &&
          event.target.classList.contains("landing-loader-panel")
        )
          reveal();
      }}
    >
      <div className="landing-loader-panel is-left" aria-hidden="true" />
      <div className="landing-loader-panel is-right" aria-hidden="true" />
      <div className="landing-loader-brand">
        <span className="landing-eyebrow">PRECISION IN EVERY JOURNEY</span>
        <p>PEGAXUS</p>
        <span className="landing-loader-rule" aria-hidden="true" />
        <span className="landing-loader-caption">Preparing the journey</span>
      </div>
    </div>
  );
}
