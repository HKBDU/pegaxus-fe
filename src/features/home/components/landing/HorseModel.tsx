import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import {
  AnimationMixer,
  Box3,
  LoopOnce,
  LoopRepeat,
  Vector3,
  type AnimationAction,
  type SkinnedMesh,
} from "three";
import horseUrl from "../../assets/horse-lite.glb?url&no-inline";
import {
  assertHorseAnimations,
  transitionHorseAction,
  HERO_APPROACH_DISTANCE,
  HERO_SCRAPE_CLIP,
  HERO_STANDING_TIME,
  HORSE_CLIPS,
} from "../../lib/horse-animation";
import { extendHorseLoader } from "../../lib/horse-materials";
import type { LandingSceneState } from "../../lib/horse-story";

useGLTF.preload(horseUrl, false, false, extendHorseLoader);

// A client-side route remount is not a new page-load experience.
const heroExperience = { started: false };

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
    // useGLTF caches the scene across route remounts, including our primitive offset.
    scene.position.set(0, 0, 0);
    // Bounds from the chosen upright pose, not the exporter's arbitrary bind pose.
    const sampler = new AnimationMixer(scene);
    const pose = sampler.clipAction(
      animations.find((clip) => clip.name === HORSE_CLIPS.idle)!,
    );
    pose.play();
    pose.time = HERO_STANDING_TIME;
    sampler.update(0);
    scene.updateMatrixWorld(true);
    scene.traverse((node) => {
      if ((node as SkinnedMesh).isSkinnedMesh)
        (node as SkinnedMesh).skeleton.update();
    });
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    sampler.stopAllAction();
    sampler.uncacheRoot(scene);
    if (!Number.isFinite(size.y) || size.y <= 0)
      throw new Error("Invalid horse model bounds");
    return {
      scale: 2.4 / size.y,
      offset: [-center.x, -box.min.y, -center.z] as [number, number, number],
    };
  }, [scene, animations]);
  const { actions, mixer } = useAnimations(animations, scene);
  const current = useRef<AnimationAction | null>(null);
  const controller = useRef<{
    finish: (immediate?: boolean) => void;
    enterStory: () => void;
  } | null>(null);
  const previousHero = useRef(true);
  const settle = useRef(0);

  useLayoutEffect(() => {
    const state = story.current;
    const returningToLanding =
      heroExperience.started && state.heroPhase === "LOADING";
    Object.assign(heroExperience, { started: true });
    const play = (name: string, once = false, paused = false) => {
      const next = actions[name];
      if (!next) throw new Error("Missing horse action: " + name);
      const previous = current.current;
      for (const action of Object.values(actions)) {
        if (action && action !== previous && action !== next) action.stop();
      }
      next
        .stopFading()
        .reset()
        .setLoop(once ? LoopOnce : LoopRepeat, once ? 1 : Infinity)
        .setEffectiveWeight(1)
        .setEffectiveTimeScale(1);
      Object.assign(next, { clampWhenFinished: once });
      if (previous && previous !== next) {
        previous.stopFading().setEffectiveWeight(1).fadeOut(0.22);
        next.fadeIn(0.22);
      }
      next.play();
      if (paused)
        Object.assign(next, { time: HERO_STANDING_TIME, paused: true });
      current.current = next;
      settle.current = 0;
      return next;
    };
    const finish = (immediate = false) => {
      if (immediate || state.reducedMotion) {
        mixer.stopAllAction();
        current.current = null;
      }
      Object.assign(state, {
        heroCompleted: true,
        heroPhase: "FINAL_POSE",
        introX: 0,
        introZ: 0,
      });
      play(HORSE_CLIPS.idle, false, true);
      if (immediate || state.reducedMotion) mixer.update(0);
    };
    const enterStory = () => {
      mixer.stopAllAction();
      current.current = null;
      const next = play(HORSE_CLIPS[state.motion], false, state.reducedMotion);
      if (!state.reducedMotion) next.setEffectiveTimeScale(state.playbackRate);
    };
    controller.current = { finish, enterStory };
    previousHero.current = state.inHero;
    const completed = ({ action }: { action: AnimationAction }) => {
      if (action !== current.current || !state.inHero || state.reducedMotion)
        return;
      if (
        state.heroPhase === "APPROACH" &&
        action === actions[HORSE_CLIPS.walk]
      ) {
        Object.assign(state, {
          introX: 0,
          introZ: 0,
          heroPhase: "HOOF_SCRAPE_1",
        });
        play(HERO_SCRAPE_CLIP, true);
      } else if (action === actions[HERO_SCRAPE_CLIP]) {
        if (state.heroPhase === "HOOF_SCRAPE_1") {
          Object.assign(state, { heroPhase: "HOOF_SCRAPE_2" });
          // Sampled start/end poses agree: restart only this completed action.
          play(HERO_SCRAPE_CLIP, true);
        } else if (state.heroPhase === "HOOF_SCRAPE_2") finish();
      }
    };
    mixer.addEventListener("finished", completed);
    if (
      state.heroCompleted ||
      state.reducedMotion ||
      !state.inHero ||
      returningToLanding
    ) {
      finish(true);
      if (!state.inHero) enterStory();
    } else {
      Object.assign(state, { heroPhase: "APPROACH" });
      play(HORSE_CLIPS.walk, true).setEffectiveTimeScale(0.85);
    }
    onReady();
    state.invalidate?.();
    return () => {
      mixer.removeEventListener("finished", completed);
      mixer.stopAllAction();
      current.current = null;
      controller.current = null;
    };
  }, [actions, mixer, onReady, story]);

  useFrame((_frame, elapsed) => {
    const state = story.current;
    const delta = Math.min(elapsed, 0.05);
    if (previousHero.current !== state.inHero) {
      controller.current?.finish(true);
      if (!state.inHero) controller.current?.enterStory();
      previousHero.current = state.inHero;
    }
    if (
      (state.reducedMotion || state.heroCompleted) &&
      state.inHero &&
      state.heroPhase !== "FINAL_POSE"
    )
      controller.current?.finish(true);
    if (state.inHero && state.heroPhase === "APPROACH" && current.current) {
      const progress = Math.min(
        1,
        current.current.time / current.current.getClip().duration,
      );
      const remaining = HERO_APPROACH_DISTANCE * (1 - progress);
      Object.assign(state, {
        introX: remaining * Math.cos(state.horseYaw),
        introZ: -remaining * Math.sin(state.horseYaw),
      });
      current.current.setEffectiveTimeScale(
        0.85 * (1 - 0.4 * Math.max(0, (progress - 0.8) / 0.2)),
      );
    } else if (!state.inHero) {
      const next = actions[HORSE_CLIPS[state.motion]];
      if (
        next &&
        (next !== current.current || next.paused !== state.reducedMotion)
      ) {
        transitionHorseAction(
          next,
          current.current ?? undefined,
          state.reducedMotion,
          state.playbackRate,
          0.22,
        );
        next.setLoop(LoopRepeat, Infinity);
        Object.assign(next, {
          clampWhenFinished: false,
          paused: state.reducedMotion,
        });
        current.current = next;
        settle.current = 0;
      }
      if (!state.reducedMotion) {
        const speed =
          performance.now() - state.lastScrollAt > 180 ? 1 : state.playbackRate;
        const action = current.current;
        if (action)
          action.setEffectiveTimeScale(
            action.getEffectiveTimeScale() +
              (speed - action.getEffectiveTimeScale()) *
                (1 - Math.exp(-10 * delta)),
          );
      }
    }
    // At most one outgoing action during the short blend; no hidden loops.
    if (state.visible) settle.current += delta;
    if (settle.current >= 0.24) {
      for (const action of Object.values(actions))
        if (action && action !== current.current && action.isScheduled())
          action.stop();
    }
    // oxlint-disable-next-line react/immutability -- external Three.js object.
    mixer.timeScale = state.visible ? 1 : 0;
    if (state.reducedMotion) mixer.update(0);
  });
  return (
    <group scale={frame.scale}>
      <primitive object={scene} position={frame.offset} dispose={null} />
    </group>
  );
}
