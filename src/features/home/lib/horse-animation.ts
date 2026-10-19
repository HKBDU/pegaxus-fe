import type { AnimationAction } from "three";

export type HorseMotion = "idle" | "walk" | "run";

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
