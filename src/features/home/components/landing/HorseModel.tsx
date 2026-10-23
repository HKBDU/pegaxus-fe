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
  Matrix4,
  Vector3,
  type AnimationAction,
  type SkinnedMesh,
  type Mesh,
} from "three";
import horseUrl from "../../assets/horse-lite.glb?url&no-inline";
import {
  assertHorseAnimations,
  JOURNEY_STOP_CLIP,
  JOURNEY_PORTRAIT_YAW,
  HERO_REVEAL_DURATION,
  HERO_WALK_CYCLES,
  HERO_WALK_REVEAL_END,
  HERO_CALM_CLIP,
  HERO_SCRAPE_CLIP,
  HERO_STANDING_TIME,
  HORSE_CLIPS,
} from "../../lib/horse-animation";
import { extendHorseLoader } from "../../lib/horse-materials";
import type { LandingSceneState } from "../../lib/horse-story";
import {
  buildJourneyStaging,
  gaitTravel,
  HOOF_NAMES,
  measureGait,
  sampleJourneyStaging,
} from "../../lib/horse-motion";

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
    const walk = measureGait(
      scene,
      animations.find((clip) => clip.name === HORSE_CLIPS.walk)!,
    );
    const run = measureGait(
      scene,
      animations.find((clip) => clip.name === HORSE_CLIPS.run)!,
    );
    const stop = measureGait(
      scene,
      animations.find((clip) => clip.name === JOURNEY_STOP_CLIP)!,
    );
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
    // Cached scenes may retain an external stage transform during hot reload.
    const box = new Box3();
    const inverse = new Matrix4().copy(scene.matrixWorld).invert();
    const local = new Matrix4();
    const vertex = new Vector3();
    scene.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh || !mesh.geometry.attributes.position) return;
      local.multiplyMatrices(inverse, mesh.matrixWorld);
      for (
        let index = 0;
        index < mesh.geometry.attributes.position.count;
        index++
      ) {
        mesh.getVertexPosition(index, vertex).applyMatrix4(local);
        box.expandByPoint(vertex);
      }
    });
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    sampler.stopAllAction();
    sampler.uncacheRoot(scene);
    if (!Number.isFinite(size.y) || size.y <= 0)
      throw new Error("Invalid horse model bounds");
    return {
      scale: 2.4 / size.y,
      offset: [-center.x, -box.min.y, -center.z] as [number, number, number],
      walk,
      run,
      stop,
      staging: buildJourneyStaging(run, stop),
      feet: HOOF_NAMES.map((name) => scene.getObjectByName(name)!),
    };
  }, [scene, animations]);
  const presentationClips = useMemo(() => {
    const source = animations.find((clip) => clip.name === HORSE_CLIPS.idle)!;
    // Only the verified calm 0–2.5s; the original clip later rears.
    const calm = AnimationUtils.subclip(source, HERO_CALM_CLIP, 0, 75, 30);
    return [...animations, calm];
  }, [animations]);
  const { actions, mixer } = useAnimations(presentationClips, scene);
  const current = useRef<AnimationAction | null>(null);
  const controller = useRef<{
    finish: (immediate?: boolean) => void;
    enterStory: () => void;
    settleMap: () => void;
  } | null>(null);
  const previousShot = useRef("");
  const previousVersion = useRef(-1);
  const settle = useRef(0);
  const readyFrame = useRef(false);
  const journeyPose = useRef({ x: 0, z: 0, yaw: 0 });
  const hoofTracking = useMemo(
    () =>
      HOOF_NAMES.map(() => ({
        armed: false,
        previous: NaN,
        last: -Infinity,
        point: new Vector3(),
      })),
    [],
  );

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
        const duration = state.inJourney
          ? name === JOURNEY_STOP_CLIP
            ? 0.16
            : 0.5
          : 0.22;
        previous.stopFading().setEffectiveWeight(1).fadeOut(duration);
        next.fadeIn(duration);
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
        heroCameraReady: true,
        heroRevealTime: HERO_REVEAL_DURATION,
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
      const distance =
        (frame.run.distance + frame.stop.distance) *
        frame.scale *
        state.horseScale;
      const done = state.journeyCompleted || state.reducedMotion;
      const phase = done
        ? "POSE_READY"
        : state.journeyPhase === "WAITING"
          ? "RUNNING"
          : state.journeyPhase;
      Object.assign(state, {
        journeyDistance: distance,
        journeyTravel: done ? distance : state.journeyTravel,
        journeyPhase: phase,
        journeyCompleted: done,
      });
      const moving = phase === "RUNNING" || phase === "STOPPING";
      const action = play(
        phase === "RUNNING"
          ? HORSE_CLIPS.run
          : phase === "STOPPING"
            ? JOURNEY_STOP_CLIP
            : HERO_CALM_CLIP,
        moving,
        state.reducedMotion || moving,
      );
      if (moving) {
        action.setEffectiveTimeScale(0.9);
        action.time = Math.min(state.journeyTime, action.getClip().duration);
      }
      if (moving) {
        sampleJourneyStaging(
          frame.staging,
          phase === "STOPPING" ? frame.stop : frame.run,
          phase === "STOPPING",
          action.time,
          journeyPose.current,
        );
        Object.assign(state, {
          journeyOffsetX:
            journeyPose.current.x * frame.scale * state.horseScale,
          journeyOffsetZ:
            journeyPose.current.z * frame.scale * state.horseScale,
          journeyYaw: journeyPose.current.yaw,
        });
      } else
        Object.assign(state, {
          journeyOffsetX: 0,
          journeyOffsetZ: 0,
          journeyYaw: JOURNEY_PORTRAIT_YAW,
        });
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
        if (state.inJourney && action === actions[HORSE_CLIPS.run]) {
          Object.assign(state, { journeyPhase: "STOPPING", journeyTime: 0 });
          play(JOURNEY_STOP_CLIP, true).setEffectiveTimeScale(0.9);
        } else if (state.inJourney && action === actions[JOURNEY_STOP_CLIP]) {
          Object.assign(state, {
            journeyPhase: "SETTLING",
            journeyTravel: state.journeyDistance,
            journeyTime: 0,
            journeyOffsetX: 0,
            journeyOffsetZ: 0,
            journeyYaw: JOURNEY_PORTRAIT_YAW,
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
          heroRevealTime: HERO_WALK_REVEAL_END,
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
    const looped = ({
      action,
      loopDelta,
    }: {
      action: AnimationAction;
      loopDelta: number;
    }) => {
      if (
        state.inHero &&
        state.heroPhase === "APPROACH" &&
        action === current.current
      )
        Object.assign(state, {
          heroWalkLoops: state.heroWalkLoops + loopDelta,
        });
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
      const distance =
        frame.walk.distance * HERO_WALK_CYCLES * frame.scale * state.horseScale;
      Object.assign(state, {
        heroPhase: "APPROACH",
        heroWalkLoops: 0,
        introX: distance * Math.cos(state.horseYaw),
        introZ: -distance * Math.sin(state.horseYaw),
      });
      play(HORSE_CLIPS.walk, true)
        .setLoop(LoopRepeat, HERO_WALK_CYCLES)
        .setEffectiveTimeScale(0.85);
    }
    // A deep link outside Hero may intentionally have no running Canvas frames.
    if (!state.inHero && !readyFrame.current) {
      readyFrame.current = true;
      onReady();
    }
    // Drei advances its mixer before our frame callback, including the first one.
    if ((state.inHero || state.inJourney) && !state.heroIntroReady) {
      // oxlint-disable-next-line react/immutability -- external Three.js mixer.
      mixer.timeScale = 0;
    }
    state.invalidate?.();
    return () => {
      mixer.removeEventListener("finished", completed);
      mixer.removeEventListener("loop", looped);
      mixer.stopAllAction();
      current.current = null;
      controller.current = null;
    };
  }, [actions, mixer, onReady, story, frame]);

  useFrame((_frame, elapsed) => {
    const state = story.current;
    const delta = Math.min(elapsed, 0.05);
    Object.assign(state, { horseFrameAt: performance.now() });
    if (!readyFrame.current) {
      readyFrame.current = true;
      onReady();
    }
    if ((state.inHero || state.inJourney) && !state.heroIntroReady) {
      if (state.inHero) {
        scene.updateWorldMatrix(true, true);
        const hoof = hoofTracking[2].point;
        frame.feet[2].getWorldPosition(hoof);
        Object.assign(state.heroHoof, {
          x: hoof.x,
          y: state.horseY + 0.06,
          z: hoof.z,
        });
      }
      // oxlint-disable-next-line react/immutability -- pause the external mixer behind the opening panels.
      mixer.timeScale = 0;
      return;
    }
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
      Object.assign(state, { mapFrameAt: performance.now() });
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
        (state.heroWalkLoops + current.current.time / frame.walk.duration) /
          HERO_WALK_CYCLES,
      );
      const remaining =
        Math.max(
          0,
          frame.walk.distance * (HERO_WALK_CYCLES - state.heroWalkLoops) -
            gaitTravel(frame.walk, current.current.time),
        ) *
        frame.scale *
        state.horseScale;
      Object.assign(state, {
        introX: remaining * Math.cos(state.horseYaw),
        introZ: -remaining * Math.sin(state.horseYaw),
        heroRevealTime: progress * HERO_WALK_REVEAL_END,
      });
      current.current.setEffectiveTimeScale(
        0.85 * (1 - 0.4 * Math.max(0, (progress - 0.8) / 0.2)),
      );
    } else if (
      state.inJourney &&
      !state.reducedMotion &&
      (state.journeyPhase === "RUNNING" || state.journeyPhase === "STOPPING") &&
      current.current
    ) {
      // Hold the start pose until the section and projected horse are visible.
      current.current.paused = !state.journeyReady;
      const stopping = state.journeyPhase === "STOPPING";
      const motion = stopping ? frame.stop : frame.run;
      sampleJourneyStaging(
        frame.staging,
        motion,
        stopping,
        current.current.time,
        journeyPose.current,
      );
      Object.assign(state, {
        journeyTime: current.current.time,
        journeyTravel:
          ((stopping ? frame.run.distance : 0) +
            gaitTravel(motion, current.current.time)) *
          frame.scale *
          state.horseScale,
        journeyOffsetX: journeyPose.current.x * frame.scale * state.horseScale,
        journeyOffsetZ: journeyPose.current.z * frame.scale * state.horseScale,
        journeyYaw: journeyPose.current.yaw,
      });
    }
    if (
      state.inJourney &&
      state.visible &&
      state.journeyReady &&
      !state.reducedMotion
    ) {
      if (state.journeyPhase === "SETTLING" && settle.current >= 0.52)
        Object.assign(state, {
          journeyPhase: "POSE_READY",
          journeyCompleted: true,
        });
    }
    if (state.inHero && state.heroPhase === "APPROACH" && state.visible) {
      scene.updateWorldMatrix(true, true);
      frame.feet.forEach((foot, index) => {
        const track = hoofTracking[index];
        foot.getWorldPosition(track.point);
        const height =
          (track.point.y - state.horseY) / (state.horseScale * frame.scale) -
          frame.offset[1];
        const velocity = (height - track.previous) / Math.max(delta, 0.001);
        if (height > frame.walk.floor[index] + 0.025) track.armed = true;
        if (
          track.armed &&
          height <= frame.walk.floor[index] + 0.012 &&
          velocity <= 0.04 &&
          performance.now() - track.last > 180
        ) {
          track.armed = false;
          track.last = performance.now();
          const pulse =
            state.hoofPulses[state.heroContacts % state.hoofPulses.length];
          Object.assign(pulse, {
            x: track.point.x,
            y: state.horseY + 0.012,
            z: track.point.z,
            born: performance.now(),
          });
          Object.assign(state, { heroContacts: state.heroContacts + 1 });
        }
        track.previous = height;
        if (index === 2)
          Object.assign(state.heroHoof, {
            x: track.point.x,
            y: state.horseY + 0.06,
            z: track.point.z,
          });
      });
    }
    if (
      state.inHero &&
      state.heroPhase === "HOOF_SCRAPE_1" &&
      current.current
    ) {
      const progress = Math.min(
        1,
        current.current.time / (current.current.getClip().duration * 0.6),
      );
      const ease =
        progress + progress * progress - progress * progress * progress;
      Object.assign(state, {
        heroRevealTime:
          progress >= 1
            ? HERO_REVEAL_DURATION
            : HERO_WALK_REVEAL_END +
              (HERO_REVEAL_DURATION - HERO_WALK_REVEAL_END) * ease,
      });
    }
    // At most one outgoing action during the short blend; no hidden loops.
    if (state.visible) settle.current += delta;
    if (settle.current >= (state.inJourney ? 0.52 : 0.24)) {
      for (const action of Object.values(actions))
        if (action && action !== current.current && action.isScheduled())
          action.stop();
    }
    // oxlint-disable-next-line react/immutability -- external Three.js object.
    mixer.timeScale =
      state.visible && (!state.inJourney || state.journeyReady) ? 1 : 0;
    if (state.reducedMotion) mixer.update(0);
  });
  return (
    <group scale={frame.scale}>
      <primitive object={scene} position={frame.offset} dispose={null} />
    </group>
  );
}
