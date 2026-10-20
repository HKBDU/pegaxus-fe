import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Canvas } from "@react-three/fiber";
import { HorseModel } from "./HorseModel";
import { HorseScene } from "./HorseScene";
import { HorseLoader } from "./HorseLoader";
import type { LandingSceneState } from "../../hooks/useLandingStory";

class HorseSceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="landing-scene-fallback">
        <span className="landing-eyebrow">THE JOURNEY CONTINUES</span>
        <p>Movement, with purpose.</p>
        <small>3D preview unavailable. Explore the story below.</small>
      </div>
    ) : (
      this.props.children
    );
  }
}

export default function HorseExperience({
  story,
  canvasLayer,
  horsePresent,
}: {
  story: RefObject<LandingSceneState>;
  canvasLayer: RefObject<HTMLDivElement | null>;
  horsePresent: boolean;
}) {
  const [pending, setPending] = useState(true);
  const [failed, setFailed] = useState(false);
  const [quality, setQuality] = useState(() => ({
    compact: matchMedia("(max-width: 1023px)").matches,
    reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
    visible: !document.hidden,
  }));
  const ready = useCallback(() => setPending(false), []);
  const contextLost = useCallback(() => setFailed(true), []);
  useEffect(() => {
    const compact = matchMedia("(max-width: 1023px)");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () =>
      setQuality({
        compact: compact.matches,
        reduced: reduced.matches,
        visible: !document.hidden,
      });
    compact.addEventListener("change", update);
    reduced.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      compact.removeEventListener("change", update);
      reduced.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  const lowPower =
    quality.compact ||
    (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4);
  useEffect(() => {
    const layer = canvasLayer.current;
    const state = story.current;
    if (layer) {
      layer.style.setProperty(
        "opacity",
        String(state.inHero ? 1 : state.horsePresence),
      );
      layer.style.setProperty("--scene-offset-y", state.stageOffsetY + "px");
      layer.style.setProperty(
        "clip-path",
        "inset(" + state.clipTop + "px 0 " + state.clipBottom + "px)",
      );
    }
  }, [canvasLayer, story]);
  return (
    <div className="landing-experience" ref={canvasLayer} aria-hidden="true">
      <HorseSceneBoundary>
        {failed ? (
          <div className="landing-scene-fallback">
            <p>Movement, with purpose.</p>
            <small>
              3D preview unavailable. All navigation remains available.
            </small>
          </div>
        ) : (
          <div className="landing-canvas-layer">
            <Canvas
              camera={{ position: [0, 0.45, 6.9], fov: 32, near: 0.1, far: 40 }}
              dpr={lowPower ? 1 : [1, 1.5]}
              frameloop={
                !quality.visible || !horsePresent
                  ? "never"
                  : quality.reduced
                    ? "demand"
                    : "always"
              }
              gl={{
                antialias: !lowPower,
                alpha: true,
                powerPreference: lowPower ? "low-power" : "high-performance",
              }}
              fallback={
                <div className="landing-scene-fallback">
                  <p>Movement, with purpose.</p>
                  <small>WebGL unavailable. Explore the journey below.</small>
                </div>
              }
              onCreated={({ gl }) => {
                gl.setClearColor("#111311", 0);
              }}
            >
              <Suspense fallback={null}>
                <HorseScene
                  story={story}
                  lowPower={lowPower}
                  onContextLost={contextLost}
                >
                  <HorseModel story={story} onReady={ready} />
                </HorseScene>
              </Suspense>
            </Canvas>
            <HorseLoader pending={pending} />
          </div>
        )}
      </HorseSceneBoundary>
    </div>
  );
}
