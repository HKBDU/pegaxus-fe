import {
  AnimationMixer,
  Vector3,
  type AnimationClip,
  type Object3D,
} from "three";
import { JOURNEY_PORTRAIT_YAW, JOURNEY_RUN_YAW } from "./horse-animation";

export const HOOF_NAMES = [
  "Bip01_R_Toe0_017",
  "Bip01_L_Toe0_023",
  "Bip01_R_Finger0_039",
  "Bip01_L_Finger0_046",
] as const;

export type GaitMotion = {
  duration: number;
  distance: number;
  travel: number[];
  floor: number[];
};

// Root-local samples also work when the cached scene is still attached during HMR.
export function measureGait(root: Object3D, clip: AnimationClip): GaitMotion {
  if (!Number.isFinite(clip.duration) || clip.duration <= 0)
    throw new Error("Invalid horse gait duration");
  const feet = HOOF_NAMES.map((name) => root.getObjectByName(name));
  if (feet.some((foot) => !foot))
    throw new Error("Horse hoof rig is incomplete");
  const count = Math.ceil(clip.duration * 60);
  const dt = clip.duration / count;
  const mixer = new AnimationMixer(root);
  const action = mixer.clipAction(clip).play();
  const point = new Vector3();
  const rows: number[][][] = [];
  const floor = feet.map(() => Infinity);
  for (let frame = 0; frame <= count; frame++) {
    action.time = Math.min(frame * dt, clip.duration - 1e-6);
    mixer.update(0);
    root.updateMatrixWorld(true);
    rows.push(
      feet.map((foot, index) => {
        foot!.getWorldPosition(point);
        root.worldToLocal(point);
        floor[index] = Math.min(floor[index], point.y);
        return [point.x, point.y];
      }),
    );
  }
  const velocities = rows.slice(1).map((row, frame) => {
    const contacts = row
      .flatMap((point, index) => {
        const before = rows[frame][index];
        const velocity = (point[0] - before[0]) / dt;
        return point[1] < floor[index] + 0.025 &&
          before[1] < floor[index] + 0.025 &&
          velocity >= 0
          ? [velocity]
          : [];
      })
      .sort((a, b) => a - b);
    return contacts.length ? contacts[Math.floor(contacts.length / 2)] : null;
  });
  // Airborne frames inherit/interpolate neighboring planted-foot velocities.
  const speed = velocities.map((value, index) => {
    if (value !== null) return value;
    let before = index - 1,
      after = index + 1;
    while (before >= 0 && velocities[before] === null) before--;
    while (after < velocities.length && velocities[after] === null) after++;
    if (before < 0) return velocities[after] ?? 0;
    if (after >= velocities.length) return velocities[before] ?? 0;
    return (
      velocities[before]! +
      (velocities[after]! - velocities[before]!) *
        ((index - before) / (after - before))
    );
  });
  const travel = [0];
  speed.forEach((value) => travel.push(travel[travel.length - 1] + value * dt));
  mixer.stopAllAction();
  mixer.uncacheRoot(root);
  if (
    floor.some((value) => !Number.isFinite(value)) ||
    !Number.isFinite(travel[travel.length - 1]) ||
    travel[travel.length - 1] <= 0
  )
    throw new Error("Invalid planted-hoof motion samples");
  return {
    duration: clip.duration,
    distance: travel[travel.length - 1],
    travel,
    floor,
  };
}

export function gaitTravel(motion: GaitMotion, time: number) {
  const frame =
    Math.min(1, Math.max(0, time / motion.duration)) *
    (motion.travel.length - 1);
  const index = Math.min(motion.travel.length - 2, Math.floor(frame));
  return (
    motion.travel[index] +
    (motion.travel[index + 1] - motion.travel[index]) * (frame - index)
  );
}

type StagingPoint = { x: number; z: number; yaw: number };
export type JourneyStaging = {
  run: StagingPoint[];
  stop: StagingPoint[];
  end: StagingPoint;
};

export function buildJourneyStaging(
  run: GaitMotion,
  stop: GaitMotion,
): JourneyStaging {
  let x = 0,
    z = 0;
  const sample = (motion: GaitMotion, turning: boolean) =>
    motion.travel.map((distance, index) => {
      // Turn during the moving portion of the stop, never in the standing portrait.
      const phase = turning
        ? Math.min(1, index / (motion.travel.length - 1) / 0.35)
        : 0;
      const ease = phase * phase * (3 - 2 * phase);
      const yaw =
        JOURNEY_RUN_YAW + (JOURNEY_PORTRAIT_YAW - JOURNEY_RUN_YAW) * ease;
      const step = index ? distance - motion.travel[index - 1] : 0;
      x -= Math.cos(yaw) * step;
      z += Math.sin(yaw) * step;
      return { x, z, yaw };
    });
  const running = sample(run, false);
  const stopping = sample(stop, true);
  return { run: running, stop: stopping, end: stopping[stopping.length - 1] };
}

export function sampleJourneyStaging(
  staging: JourneyStaging,
  motion: GaitMotion,
  stopping: boolean,
  time: number,
  target: StagingPoint,
) {
  const points = stopping ? staging.stop : staging.run;
  const frame =
    Math.min(1, Math.max(0, time / motion.duration)) * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(frame));
  const fraction = frame - index;
  const a = points[index],
    b = points[index + 1];
  target.x = a.x + (b.x - a.x) * fraction - staging.end.x;
  target.z = a.z + (b.z - a.z) * fraction - staging.end.z;
  target.yaw = a.yaw + (b.yaw - a.yaw) * fraction;
}
