import { useEffect } from "react";
import poseUrl from "@/assets/horse-loader-pose.webp?inline";

export function HorseLoader({
  status,
  onReveal,
}: {
  status: "loading" | "ready" | "unavailable";
  onReveal: () => void;
}) {
  useEffect(() => {
    if (status === "ready") onReveal();
  }, [status, onReveal]);
  if (status === "ready") return null;
  return (
    <div
      className="landing-loader landing-scene-fallback"
      role="status"
      aria-live="polite"
    >
      <img src={poseUrl} width="192" height="192" alt="" />
      <span className="landing-eyebrow">FORWARD, WITH PURPOSE</span>
      <small>
        {status === "loading"
          ? "Preparing the 3D journey. Explore while it loads."
          : "3D preview unavailable. Explore the journey below."}
      </small>
    </div>
  );
}
