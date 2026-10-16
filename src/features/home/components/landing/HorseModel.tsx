import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { Box3, Vector3, type AnimationAction } from "three";
import horseUrl from "../../assets/horse-lite.glb?url&no-inline";
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

  const clips = animations;
  const { actions, mixer } = useAnimations(clips, scene);
  const current = useRef<{
    motion: HorseMotion;
    action: AnimationAction;
  } | null>(null);
  const playback = useRef(0.6);
  const wasReduced = useRef(false);
  const intro = useRef<{
    active: boolean;
    startTime: number;
    done: boolean;
  }>({
    active: false,
    startTime: 0,
    done: false,
  });

  useEffect(() => {
    onReady();
    const reduced = story.current.reducedMotion;
    const scrolledPastHero =
      window.scrollY > 50 || (story.current.rawProgress ?? 0) > 0.15;

    if (reduced || scrolledPastHero) {
      intro.current.done = true;
      story.current.introScale = 1.0;
      story.current.introZ = 0;
    } else {
      intro.current.active = true;
      intro.current.startTime = performance.now();
      story.current.introScale = 0.82;
      story.current.introZ = -2.2;
    }

    // Hero always starts in upright SlowIdle at 0.6x
    const idleAction = actions[HORSE_CLIPS.idle];
    if (idleAction) {
      idleAction
        .reset()
        .setEffectiveTimeScale(0.6)
        .setEffectiveWeight(1)
        .play();
      current.current = { motion: "idle", action: idleAction };
    }

    return () => {
      mixer.stopAllAction();
      current.current = null;
    };
  }, [onReady, mixer, actions, story]);

  useFrame((_frame, elapsed) => {
    const state = story.current;

    // 1. Initial Page-Load Approach along Depth Axis (No locomotion, pure depth reveal):
    if (intro.current.active && !state.reducedMotion) {
      const elapsedIntro = (performance.now() - intro.current.startTime) / 1000;
      // 0.2s initial settle, then gentle 2.2s forward approach in Z
      const rawP = Math.min(1, Math.max(0, (elapsedIntro - 0.2) / 2.2));
      const t = 1 - Math.pow(1 - rawP, 3); // cubic ease out
      state.introScale = 0.82 + (1.0 - 0.82) * t;
      state.introZ = -2.2 * (1 - t);

      if (rawP >= 1 || (state.rawProgress ?? 0) > 0.05) {
        intro.current.active = false;
        intro.current.done = true;
        state.introScale = 1.0;
        state.introZ = 0;
      }
    } else if (intro.current.done) {
      state.introScale = 1.0;
      state.introZ = 0;
    }

    // 2. Living Sculpture State (Hero: rawProgress <= 0.15) & Journey Locomotion (> 0.15):
    let targetMotion: HorseMotion = state.motion;
    let targetSpeed = 0.6;

    if ((state.rawProgress ?? 0) <= 0.15) {
      // Locked in stationary Hero pose playing upright HorseALL_SlowIdle at 0.6x
      targetMotion = "idle";
      targetSpeed = 0.6;
    } else {
      targetSpeed =
        performance.now() - state.lastScrollAt > 180 ? 1 : state.playbackRate;
    }

    const previous = current.current;
    if (
      previous?.motion !== targetMotion ||
      wasReduced.current !== state.reducedMotion
    ) {
      const next = actions[HORSE_CLIPS[targetMotion]];
      if (!next)
        throw new Error("Missing horse action: " + HORSE_CLIPS[targetMotion]);
      transitionHorseAction(
        next,
        previous?.action,
        state.reducedMotion,
        targetSpeed,
        0.4,
      );
      current.current = { motion: targetMotion, action: next };
      wasReduced.current = state.reducedMotion;
    }

    // Mixer is an external imperative object. Only reduced-motion/hidden tabs pause it.
    // oxlint-disable-next-line react/immutability
    mixer.timeScale = state.visible && !state.reducedMotion ? 1 : 0;
    if (state.reducedMotion) {
      current.current?.action.stopFading().setEffectiveWeight(1);
      mixer.update(0);
    }

    // Smoothly damp playback speed
    playback.current +=
      (targetSpeed - playback.current) *
      (1 - Math.exp(-10 * Math.min(elapsed, 0.05)));

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
