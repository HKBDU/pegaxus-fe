import type { AnimationAction } from "three";

export type HorseMotion = "idle" | "walk" | "run";
export type HeroPhase =
  "LOADING" | "APPROACH" | "HOOF_SCRAPE_1" | "HOOF_SCRAPE_2" | "FINAL_POSE";

export const HERO_APPROACH_DISTANCE = 1.2;
// The original rig faces −X. This yaw aims forward and modestly toward the copy.
export const HERO_YAW = 0.92;
export const JOURNEY_STOP_CLIP = "HorseALL_RunToStop";
export const JOURNEY_RUN_YAW = 1.05;
export const JOURNEY_PORTRAIT_YAW = 2.11;
export const HERO_HOOF_EXTENSION = 2;
const HERO_RISE_DURATION = 3.6;
export const HERO_REVEAL_DURATION = HERO_RISE_DURATION + HERO_HOOF_EXTENSION;
export const HERO_WALK_CYCLES = 2;
export const HERO_WALK_REVEAL_END = HERO_REVEAL_DURATION * 0.82;
export const HERO_CALM_CLIP = "HorseALL_IdleEars_Calm";
export const HERO_STANDING_TIME = 0;
export const HERO_SCRAPE_CLIP = "HorseALL_HoofScrape2";

export function getHeroRevealProgress(time: number) {
  // Add two seconds only to the low first 16%; preserve the remaining rise pace.
  if (time >= HERO_REVEAL_DURATION) return 1;
  const lowDuration = HERO_RISE_DURATION * 0.16;
  const elapsed = Math.min(HERO_REVEAL_DURATION, Math.max(0, time));
  return elapsed < lowDuration + HERO_HOOF_EXTENSION
    ? (elapsed / (lowDuration + HERO_HOOF_EXTENSION)) * 0.16
    : (elapsed - HERO_HOOF_EXTENSION) / HERO_RISE_DURATION;
}

export function getLocomotionPhase(
  time: number,
  duration: number,
  nextDuration: number,
) {
  if (
    !Number.isFinite(time) ||
    !Number.isFinite(duration) ||
    !Number.isFinite(nextDuration) ||
    duration <= 0 ||
    nextDuration <= 0
  )
    return 0;
  return (
    ((((time % duration) + duration) % duration) / duration) * nextDuration
  );
}

export function getPlaybackRate(velocity: number) {
  return Number.isFinite(velocity)
    ? 1 + Math.min(1, Math.abs(velocity) / 2400) * 0.15
    : 1;
}

export const HORSE_CLIPS = {
  idle: "HorseALL_IdleEars",
  walk: "HorseALL_SlowWalk",
  run: "HorseALL_RunLoop",
} as const satisfies Record<HorseMotion, string>;

export function assertHorseAnimations(clips: readonly { name: string }[]) {
  const names = new Set(clips.map((clip) => clip.name));
  for (const name of Object.values(HORSE_CLIPS)) {
    if (!names.has(name)) throw new Error(`Missing horse animation: ${name}`);
  }
  if (!names.has(HERO_SCRAPE_CLIP))
    throw new Error(`Missing horse animation: ${HERO_SCRAPE_CLIP}`);
  if (!names.has(JOURNEY_STOP_CLIP))
    throw new Error(`Missing horse animation: ${JOURNEY_STOP_CLIP}`);
}

export function transitionHorseAction(
  next: AnimationAction,
  previous: AnimationAction | undefined,
  reducedMotion: boolean,
  playbackRate: number,
  fadeDuration = 0.4,
) {
  const previousName = previous?.getClip().name;
  const nextName = next.getClip().name;
  const locomotion =
    previous &&
    (previousName === HORSE_CLIPS.walk || previousName === HORSE_CLIPS.run) &&
    (nextName === HORSE_CLIPS.walk || nextName === HORSE_CLIPS.run);
  const phase =
    locomotion && !reducedMotion
      ? getLocomotionPhase(
          previous.time,
          previous.getClip().duration,
          next.getClip().duration,
        )
      : 0;
  // Fades cannot finish after the mixer pauses. Discard ALL outgoing actions,
  // including an earlier locomotion still fading beneath the current Idle.
  if (reducedMotion) next.getMixer().stopAllAction();
  else previous?.fadeOut(fadeDuration);
  next.reset().setEffectiveTimeScale(playbackRate).setEffectiveWeight(1);
  next.time = phase;
  if (!reducedMotion) next.fadeIn(fadeDuration);
  next.play();
}
