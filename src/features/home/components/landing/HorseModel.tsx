import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import {
  AnimationMixer,
  AnimationUtils,
  Box3,
  LoopOnce,
  LoopRepeat,
  LoopPingPong,
  Vector3,
  type AnimationAction,
  type SkinnedMesh,
} from "three";
import horseUrl from "../../assets/horse-lite.glb?url&no-inline";
import {
  assertHorseAnimations,
  HERO_APPROACH_DISTANCE,
  JOURNEY_STRIDE,
  JOURNEY_WALK_CYCLES,
  HERO_CALM_CLIP,
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
    // Recompute posed vertices: cached SkinnedMesh bounds may belong to a prior mount/pose.
    const box = new Box3().setFromObject(scene, true);
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
  const presentationClips = useMemo(() => {
    const source = animations.find((clip) => clip.name === HORSE_CLIPS.idle)!;
    // Only the verified calm 0–2.5s; the original clip later rears.
    const calm = AnimationUtils.subclip(source, HERO_CALM_CLIP, 0, 75, 30);
    return [...animations, calm];
  }, [animations]);
  const { actions, mixer } = useAnimations(presentationClips, scene);
  const journeyLoops = useRef(0);
  const current = useRef<AnimationAction | null>(null);
  const controller = useRef<{
    finish: (immediate?: boolean) => void;
    enterStory: () => void;
    settleMap: () => void;
  } | null>(null);
  const previousShot = useRef("");
  const previousVersion = useRef(-1);
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
      if (name === HERO_CALM_CLIP)
        next.setLoop(LoopPingPong, Infinity).setEffectiveTimeScale(0.65);
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
      play(HERO_CALM_CLIP, false, state.reducedMotion);
      if (immediate || state.reducedMotion) mixer.update(0);
    };
    const enterStory = () => {
      mixer.stopAllAction();
      current.current = null;
      if (state.inMap) {
        play(
          state.reducedMotion || state.mapProgress >= 1
            ? HERO_CALM_CLIP
            : HORSE_CLIPS.run,
          false,
          true,
        );
        mixer.update(0);
        return;
      }
      if (!state.inJourney) {
        play(HERO_CALM_CLIP, false, state.reducedMotion);
        mixer.update(0);
        return;
      }
      const progress =
        state.journeyDistance > 0
          ? Math.min(1, state.journeyTravel / state.journeyDistance)
          : 0;
      const walking =
        !state.journeyCompleted && !state.reducedMotion && progress < 1;
      const distance =
        JOURNEY_STRIDE * frame.scale * state.horseScale * JOURNEY_WALK_CYCLES;
      Object.assign(state, {
        journeyDistance: distance,
        journeyTravel: walking ? distance * progress : distance,
        journeyCompleted:
          state.journeyCompleted || state.reducedMotion || progress >= 1,
      });
      journeyLoops.current = walking
        ? Math.floor(progress * JOURNEY_WALK_CYCLES)
        : 0;
      const action = play(
        walking ? HORSE_CLIPS.walk : HERO_CALM_CLIP,
        false,
        state.reducedMotion || walking,
      );
      if (walking) {
        action
          .setLoop(LoopRepeat, JOURNEY_WALK_CYCLES - journeyLoops.current)
          .setEffectiveTimeScale(0.85);
        action.clampWhenFinished = true;
        action.time =
          (progress * JOURNEY_WALK_CYCLES - journeyLoops.current) *
          action.getClip().duration;
      }
      mixer.update(0);
    };
    const settleMap = () => {
      if (current.current) current.current.paused = true;
      play(HERO_CALM_CLIP, false, state.reducedMotion);
    };
    controller.current = { finish, enterStory, settleMap };
    previousShot.current = state.inHero
      ? "hero"
      : state.inJourney
        ? "journey"
        : state.inMap
          ? "map"
          : "none";
    previousVersion.current = state.shotVersion;
    const completed = ({ action }: { action: AnimationAction }) => {
      if (action !== current.current || state.reducedMotion) return;
      if (!state.inHero) {
        if (state.inJourney && action === actions[HORSE_CLIPS.walk]) {
          Object.assign(state, {
            journeyCompleted: true,
            journeyTravel: state.journeyDistance,
          });
          play(HERO_CALM_CLIP);
        }
        return;
      }
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
    const looped = ({ action }: { action: AnimationAction }) => {
      if (
        state.inJourney &&
        action === current.current &&
        action === actions[HORSE_CLIPS.walk]
      )
        journeyLoops.current += 1;
    };
    mixer.addEventListener("finished", completed);
    mixer.addEventListener("loop", looped);
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
      mixer.removeEventListener("loop", looped);
      mixer.stopAllAction();
      current.current = null;
      controller.current = null;
    };
  }, [actions, mixer, onReady, story, frame.scale]);

  useFrame((_frame, elapsed) => {
    const state = story.current;
    const delta = Math.min(elapsed, 0.05);
    const shot = state.inHero
      ? "hero"
      : state.inJourney
        ? "journey"
        : state.inMap
          ? "map"
          : "none";
    if (
      previousShot.current !== shot ||
      previousVersion.current !== state.shotVersion
    ) {
      controller.current?.finish(true);
      if (!state.inHero) controller.current?.enterStory();
      previousShot.current = shot;
      previousVersion.current = state.shotVersion;
    }
    if (
      (state.reducedMotion || state.heroCompleted) &&
      state.inHero &&
      state.heroPhase !== "FINAL_POSE"
    )
      controller.current?.finish(true);
    if (state.inMap && current.current) {
      if (state.mapProgress >= 1 || state.reducedMotion) {
        if (current.current.getClip().name !== HERO_CALM_CLIP)
          controller.current?.settleMap();
      } else {
        current.current.paused =
          !state.mapRunning || performance.now() - state.mapUpdatedAt > 140;
        current.current.setEffectiveTimeScale(state.mapRunRate);
      }
    } else if (
      state.inHero &&
      state.heroPhase === "APPROACH" &&
      current.current
    ) {
      const progress = Math.min(
        1,
        current.current.time / current.current.getClip().duration,
      );
      const distance =
        state.profile === "desktop" ? HERO_APPROACH_DISTANCE : 0.65;
      const remaining = distance * (1 - progress);
      Object.assign(state, {
        introX: remaining * Math.cos(state.horseYaw),
        introZ: -remaining * Math.sin(state.horseYaw),
      });
      current.current.setEffectiveTimeScale(
        0.85 * (1 - 0.4 * Math.max(0, (progress - 0.8) / 0.2)),
      );
    } else if (
      state.inJourney &&
      !state.reducedMotion &&
      !state.journeyCompleted &&
      current.current?.getClip().name === HORSE_CLIPS.walk
    ) {
      // Hold the start pose until the section and projected horse are visible.
      current.current.paused = !(state.journeyReady && state.journeyFramed);
      Object.assign(state, {
        journeyTravel:
          state.journeyDistance *
          Math.min(
            1,
            (journeyLoops.current +
              current.current.time / current.current.getClip().duration) /
              JOURNEY_WALK_CYCLES,
          ),
      });
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
