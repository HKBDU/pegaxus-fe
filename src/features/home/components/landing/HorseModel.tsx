import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { Box3, Vector3, type AnimationAction } from "three";
import horseUrl from "../../assets/horse.glb?url&no-inline";
import {
  assertHorseAnimations,
  transitionHorseAction,
  HORSE_CLIPS,
  type HorseMotion,
} from "../../lib/horse-animation";
import { extendHorseLoader } from "../../lib/horse-materials";
import type { LandingSceneState } from "../../lib/horse-story";

useGLTF.preload(horseUrl, false, false, extendHorseLoader);

export function HorseModel({
  story,
  onReady,
}: {
  story: RefObject<LandingSceneState>;
  onReady: () => void;
}) {
  const { scene, animations } = useGLTF(
    horseUrl,
    false,
    false,
    extendHorseLoader,
  );
  const frame = useMemo(() => {
    assertHorseAnimations(animations);
    scene.updateMatrixWorld(true);
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    if (!Number.isFinite(size.y) || size.y <= 0)
      throw new Error("Invalid horse model bounds");
    return {
      scale: 2.4 / size.y,
      offset: [-center.x, -box.min.y, -center.z] as [number, number, number],
    };
  }, [scene, animations]);
  const clips = useMemo(
    () =>
      animations.filter((clip) =>
        Object.values(HORSE_CLIPS).some((name) => name === clip.name),
      ),
    [animations],
  );
  const { actions, mixer } = useAnimations(clips, scene);
  const current = useRef<{
    motion: HorseMotion;
    action: AnimationAction;
  } | null>(null);
  const playback = useRef(1);
  const wasReduced = useRef(false);
  useEffect(() => {
    onReady();
    return () => {
      mixer.stopAllAction();
      current.current = null;
    };
  }, [onReady, mixer]);
  useFrame((_frame, elapsed) => {
    const state = story.current;
    const previous = current.current;
    if (
      previous?.motion !== state.motion ||
      wasReduced.current !== state.reducedMotion
    ) {
      const next = actions[HORSE_CLIPS[state.motion]];
      if (!next)
        throw new Error("Missing horse action: " + HORSE_CLIPS[state.motion]);
      transitionHorseAction(
        next,
        previous?.action,
        state.reducedMotion,
        playback.current,
      );
      current.current = { motion: state.motion, action: next };
      wasReduced.current = state.reducedMotion;
    }
    // Mixer is an external imperative object. Only reduced-motion/hidden tabs
    // pause it; stopping document scroll NEVER freezes clip time.
    // oxlint-disable-next-line react/immutability
    mixer.timeScale = state.visible && !state.reducedMotion ? 1 : 0;
    if (state.reducedMotion) {
      current.current?.action.stopFading().setEffectiveWeight(1);
      mixer.update(0);
    }
    const speed =
      performance.now() - state.lastScrollAt > 180 ? 1 : state.playbackRate;
    playback.current +=
      (speed - playback.current) *
      (1 - Math.exp(-10 * Math.min(elapsed, 0.05)));
    // Keep outgoing locomotion at the same gentle modulation during a fade.
    for (const clip of clips) {
      const action = actions[clip.name];
      if (action?.isRunning()) action.setEffectiveTimeScale(playback.current);
    }
  });
  return (
    <group scale={frame.scale}>
      <primitive object={scene} position={frame.offset} dispose={null} />
    </group>
  );
}
