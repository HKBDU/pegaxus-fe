import { useProgress } from "@react-three/drei";

export function HorseLoader({ pending }: { pending: boolean }) {
  const { progress } = useProgress();
  return (
    <div
      className={`landing-loader${pending ? "" : " is-loaded"}`}
      role="status"
      aria-live="polite"
    >
      <span className="landing-eyebrow">PEGAXUS</span>
      <p>Preparing the journey</p>
      <div className="landing-loader-track">
        <span style={{ width: `${Math.max(4, progress)}%` }} />
      </div>
      <span className="landing-loader-percent">{Math.round(progress)}%</span>
    </div>
  );
}
