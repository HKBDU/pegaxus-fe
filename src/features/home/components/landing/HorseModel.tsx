import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import {
  AnimationMixer,
  AnimationClip,
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
  type Object3D,
} from "three";
import horseUrl from "../../assets/horse-meshopt.glb?url&no-inline";
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
  type GaitMotion,
  type JourneyStaging,
} from "../../lib/horse-motion";

useGLTF.preload(horseUrl, false, false, extendHorseLoader);

// A client-side route remount is not a new page-load experience.
const heroExperience = { completed: false };
const HERO_IDLE = `${HERO_CALM_CLIP}_Hero`;
const JOURNEY_IDLE = `${HERO_CALM_CLIP}_Journey`;
const JOURNEY_RUN = `${HORSE_CLIPS.run}_Journey`;
type PreparedHorse = {
  scale: number;
  offset: [number, number, number];
  walk: GaitMotion;
  run: GaitMotion;
  stop: GaitMotion;
  staging: JourneyStaging;
};
// Cache only asset-derived data; actions, blends and snapshots remain instance-local.
const frameCache = new WeakMap<
  Object3D,
  { clips: readonly AnimationClip[]; data: PreparedHorse }
>();
const calmCache = new WeakMap<AnimationClip, AnimationClip>();
type Owner = "hero" | "journey" | "map" | "none";
type Blend = {
  previous: AnimationAction;
  next: AnimationAction;
  elapsed: number;
  duration: number;
};
type PlaybackSnapshot = {
  current: AnimationAction | null;
  settle: number;
  blend: Blend | null;
  outgoing: AnimationAction | null;
  actions: {
    action: AnimationAction;
    time: number;
    weight: number;
    paused: boolean;
  }[];
};

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
    const feet = HOOF_NAMES.map((name) => scene.getObjectByName(name)!);
    const cached = frameCache.get(scene);
    if (
      cached &&
      cached.clips.length === animations.length &&
      cached.clips.every((clip, index) => clip === animations[index])
    )
      return { ...cached.data, feet };
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
    const data: PreparedHorse = {
      scale: 2.4 / size.y,
      offset: [-center.x, -box.min.y, -center.z] as [number, number, number],
      walk,
      run,
      stop,
      staging: buildJourneyStaging(run, stop),
    };
    for (const motion of [walk, run, stop]) {
      Object.freeze(motion.travel);
      Object.freeze(motion.floor);
      Object.freeze(motion);
    }
    for (const points of [data.staging.run, data.staging.stop]) {
      points.forEach(Object.freeze);
      Object.freeze(points);
    }
    Object.freeze(data.staging);
    Object.freeze(data.offset);
    Object.freeze(data);
    frameCache.set(scene, { clips: [...animations], data });
    return { ...data, feet };
  }, [scene, animations]);
  const presentationClips = useMemo(() => {
    const source = animations.find((clip) => clip.name === HORSE_CLIPS.idle)!;
    // Only the verified calm 0–2.5s; the original clip later rears.
    let calm = calmCache.get(source);
    if (!calm) {
      calm = AnimationUtils.subclip(source, HERO_CALM_CLIP, 0, 75, 30);
      calmCache.set(source, calm);
    }
    const run = animations.find((clip) => clip.name === HORSE_CLIPS.run)!;
    // Independent action identities share immutable tracks, not another model/rig.
    return [
      ...animations.filter((clip) =>
        [
          HORSE_CLIPS.walk,
          HORSE_CLIPS.run,
          JOURNEY_STOP_CLIP,
          HERO_SCRAPE_CLIP,
        ].includes(clip.name),
      ),
      calm,
      new AnimationClip(HERO_IDLE, calm.duration, calm.tracks, calm.blendMode),
      new AnimationClip(
        JOURNEY_IDLE,
        calm.duration,
        calm.tracks,
        calm.blendMode,
      ),
      new AnimationClip(JOURNEY_RUN, run.duration, run.tracks, run.blendMode),
    ];
  }, [animations]);
  const { actions, mixer } = useAnimations(presentationClips, scene);
  const current = useRef<AnimationAction | null>(null);
  const controller = useRef<{
    settleMap: () => void;
    synchronize: (delta: number) => void;
  } | null>(null);
  const previousShot = useRef("");
  const previousVersion = useRef(-1);
  const settle = useRef(0);
  const owner = useRef<Owner>("none");
  const ownerChanged = useRef(false);
  const blend = useRef<Blend | null>(null);
  const outgoing = useRef<AnimationAction | null>(null);
  const snapshots = useRef<
    Partial<Record<"hero" | "journey", PlaybackSnapshot>>
  >({});
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
    const play = (name: string, once = false, paused = false) => {
      const actionName =
        name === HERO_CALM_CLIP && owner.current === "hero"
          ? HERO_IDLE
          : name === HERO_CALM_CLIP && owner.current === "journey"
            ? JOURNEY_IDLE
            : name === HORSE_CLIPS.run && owner.current === "journey"
              ? JOURNEY_RUN
              : name;
      const next = actions[actionName];
      if (!next) throw new Error("Missing horse action: " + name);
      const previous = current.current;
      for (const action of Object.values(actions)) {
        if (action?.enabled && action !== previous && action !== next)
          action.stop();
      }
      outgoing.current = previous && previous !== next ? previous : null;
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
        previous.stopFading().setEffectiveWeight(1);
        if (owner.current === "hero" || owner.current === "journey") {
          next.setEffectiveWeight(0);
          blend.current = { previous, next, elapsed: 0, duration };
        } else {
          previous.fadeOut(duration);
          next.fadeIn(duration);
        }
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
        for (const action of Object.values(actions))
          if (action?.enabled) action.stop();
        current.current = null;
        blend.current = null;
        outgoing.current = null;
      }
      Object.assign(heroExperience, { completed: true });
      Object.assign(state, {
        heroCompleted: true,
        heroLifecycle: "COMPLETED",
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
      const done = state.journeyCompleted;
      const phase = done ? "POSE_READY" : state.journeyPhase;
      Object.assign(state, {
        journeyDistance: distance,
        journeyTravel: done ? distance : state.journeyTravel,
        journeyPhase: phase,
        journeyCompleted: done,
      });
      const moving =
        phase === "WAITING" || phase === "RUNNING" || phase === "STOPPING";
      const action = play(
        state.reducedMotion
          ? HERO_CALM_CLIP
          : phase === "RUNNING" || phase === "WAITING"
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
    const completed = ({ action }: { action: AnimationAction }) => {
      if (action !== current.current || state.reducedMotion) return;
      if (!state.inHero) {
        if (state.inJourney && action === actions[JOURNEY_RUN]) {
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
            journeyStopProgress: 1,
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
    const enterHero = () => {
      if (state.heroCompleted || heroExperience.completed) {
        finish(true);
        return;
      }
      const distance =
        frame.walk.distance * HERO_WALK_CYCLES * frame.scale * state.horseScale;
      Object.assign(state, {
        heroPhase: "APPROACH",
        heroWalkLoops: 0,
        introX: distance * Math.cos(state.horseYaw),
        introZ: -distance * Math.sin(state.horseYaw),
      });
      play(HORSE_CLIPS.walk, true, true)
        .setLoop(LoopRepeat, HERO_WALK_CYCLES)
        .setEffectiveTimeScale(0.85);
    };
    const synchronize = (elapsed: number) => {
      ownerChanged.current = false;
      const next: Owner = state.inHero
        ? "hero"
        : state.inJourney
          ? "journey"
          : state.inMap
            ? "map"
            : "none";
      if (
        previousShot.current !== next ||
        previousVersion.current !== state.shotVersion
      ) {
        ownerChanged.current = true;
        const previous = owner.current;
        if (previous === "hero" || previous === "journey") {
          const lifecycle =
            previous === "hero" ? "heroLifecycle" : "journeyLifecycle";
          if (state[lifecycle] === "PLAYING")
            Object.assign(state, { [lifecycle]: "SUSPENDED" });
          snapshots.current[previous] = {
            current: current.current,
            settle: settle.current,
            blend: blend.current,
            outgoing: outgoing.current,
            actions: Object.values(actions).flatMap((action) =>
              action?.enabled && action.isScheduled()
                ? [
                    {
                      action,
                      time: action.time,
                      weight: action.getEffectiveWeight(),
                      paused: action.paused,
                    },
                  ]
                : [],
            ),
          };
          for (const { action } of snapshots.current[previous]!.actions) {
            action.stopFading().setEffectiveWeight(0);
            Object.assign(action, { enabled: false, paused: true });
          }
        } else {
          for (const action of Object.values(actions))
            if (action?.enabled) action.stop();
        }
        current.current = null;
        blend.current = null;
        outgoing.current = null;
        settle.current = 0;
        owner.current = next;
        const saved =
          next === "hero" || next === "journey"
            ? snapshots.current[next]
            : undefined;
        if (saved) {
          current.current = saved.current;
          settle.current = saved.settle;
          blend.current = saved.blend;
          outgoing.current = saved.outgoing;
          for (const { action, time, weight, paused } of saved.actions) {
            Object.assign(action, { enabled: true, time, paused });
            action.setEffectiveWeight(weight);
          }
          // oxlint-disable-next-line react/immutability -- restore an external Three.js pose.
          mixer.update(0);
        } else if (next === "hero") enterHero();
        else if (next !== "none") enterStory();
        previousShot.current = next;
        previousVersion.current = state.shotVersion;
      }
      const cinematic = next === "hero" || next === "journey";
      const ready =
        state.visible &&
        state.heroIntroReady &&
        (next === "hero" ? state.heroReady : state.journeyReady);
      if (cinematic) {
        const lifecycle =
          next === "hero" ? "heroLifecycle" : "journeyLifecycle";
        if (ready) {
          if (state.reducedMotion && state[lifecycle] !== "COMPLETED") {
            if (next === "hero") finish(true);
            else {
              for (const action of Object.values(actions))
                if (action?.enabled) action.stop();
              Object.assign(state, {
                journeyLifecycle: "COMPLETED",
                journeyCompleted: true,
                journeyPhase: "POSE_READY",
                journeyStopProgress: 1,
              });
              enterStory();
            }
          } else if (state[lifecycle] !== "COMPLETED")
            Object.assign(state, { [lifecycle]: "PLAYING" });
          if (next === "journey" && state.journeyPhase === "WAITING")
            Object.assign(state, { journeyPhase: "RUNNING" });
          if (current.current && !state.reducedMotion)
            current.current.paused = false;
        } else if (state[lifecycle] === "PLAYING")
          Object.assign(state, { [lifecycle]: "SUSPENDED" });
      }
      // Runs before Drei's mixer callback: an inactive owner never gets a stray frame.
      // oxlint-disable-next-line react/immutability -- external Three.js mixer clock.
      mixer.timeScale = cinematic
        ? ready && !state.reducedMotion
          ? Math.min(1, 0.05 / Math.max(elapsed, 0.001))
          : 0
        : next === "map" && state.visible
          ? 1
          : 0;
    };
    controller.current = { settleMap, synchronize };
    previousShot.current = "";
    synchronize(0);
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
      outgoing.current = null;
    };
  }, [actions, mixer, onReady, story, frame]);

  useFrame((_frame, elapsed) => controller.current?.synchronize(elapsed), -1);

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
    const cinematicPlaying =
      state.visible &&
      (state.inHero ? state.heroReady : state.inJourney && state.journeyReady);
    if (cinematicPlaying && state.inHero)
      Object.assign(state, {
        heroEffectTime: state.heroEffectTime + delta * 1000,
      });
    if (cinematicPlaying && blend.current) {
      const transition = blend.current;
      transition.elapsed = Math.min(
        transition.duration,
        transition.elapsed + delta,
      );
      const progress = transition.elapsed / transition.duration;
      transition.previous.setEffectiveWeight(1 - progress);
      transition.next.setEffectiveWeight(progress);
      if (progress >= 1) {
        transition.previous.stop();
        if (outgoing.current === transition.previous) outgoing.current = null;
        blend.current = null;
      }
    }
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
        journeyStopProgress: stopping
          ? current.current.time / frame.stop.duration
          : 0,
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
          journeyLifecycle: "COMPLETED",
        });
    }
    if (
      state.inHero &&
      state.heroPhase === "APPROACH" &&
      cinematicPlaying &&
      !ownerChanged.current
    ) {
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
            born: state.heroEffectTime,
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
    if (state.visible && (state.inMap || cinematicPlaying))
      settle.current += delta;
    if (
      outgoing.current &&
      !blend.current &&
      settle.current >= (state.inJourney ? 0.52 : 0.24)
    ) {
      if (
        outgoing.current.enabled &&
        outgoing.current !== current.current &&
        outgoing.current.isScheduled()
      )
        outgoing.current.stop();
      outgoing.current = null;
    }
    if (state.reducedMotion) mixer.update(0);
  });
  return (
    <group scale={frame.scale}>
      <primitive object={scene} position={frame.offset} dispose={null} />
    </group>
  );
}
