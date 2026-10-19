import type { HorseMotion } from "./horse-animation";
import type { LandingChapter } from "./landing-navigation";

export type StoryProfile = "desktop" | "tablet" | "mobile";
export type HorseShot = {
  horsePresence: number;
  horseX: number;
  horseY: number;
  horseZ: number;
  horseScale: number;
  horseYaw: number;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  keyLight: number;
  rimLight: number;
  motion: HorseMotion;
};
export type LandingSceneState = HorseShot & {
  profile: StoryProfile;
  pointerX: number;
  pointerY: number;
  reducedMotion: boolean;
  lowPower: boolean;
  visible: boolean;
  playbackRate: number;
  lastScrollAt: number;
  rawProgress: number;
  storyProgress: number;
  introScale: number;
  introZ: number;
};
export type MotionCue = { at: number; motion: HorseMotion };

// Composition targets only. GSAP interpolates one mutable state;
// R3F owns the final world/camera transforms.
export function getHorseShots(profile: StoryProfile, reduced: boolean) {
  const base: HorseShot = {
    horsePresence: 1,
    horseX: 1.6,
    horseY: -1.25,
    horseZ: 0,
    horseScale: 1,
    horseYaw: -0.48,
    cameraX: 0,
    cameraY: 0.45,
    cameraZ: 6.9,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    keyLight: 3.8,
    rimLight: 2.6,
    motion: "idle",
  };
  const shots: Record<LandingChapter, HorseShot> = {
    home: { ...base },
    journey: {
      ...base,
      horseX: -1.65,
      horseYaw: 0.08,
      horseScale: 0.9,
      cameraZ: 7.5,
      motion: "walk",
    },
    compliance: {
      ...base,
      horseX: 2.15,
      horseScale: 0.72,
      horseYaw: -0.3,
      cameraZ: 7.4,
      keyLight: 3.2,
      rimLight: 1.8,
    },
    platform: {
      ...base,
      horsePresence: 0,
      horseX: 6,
      horseScale: 0.65,
      cameraZ: 8,
      rimLight: 1.5,
    },
    care: {
      ...base,
      horseX: -2.55,
      horseY: -1.9,
      horseScale: 1.38,
      horseYaw: 2.65,
      cameraY: 0.75,
      cameraZ: 6.1,
      targetY: 0.4,
      keyLight: 4.2,
      rimLight: 2.1,
    },
    movement: {
      ...base,
      horseX: 1.15,
      horseYaw: 0.06,
      horseScale: 0.87,
      cameraZ: 8.1,
      motion: "walk",
    },
    about: {
      ...base,
      horseX: -5.5,
      horseYaw: 0.06,
      horseScale: 0.8,
      cameraZ: 8.5,
      motion: "run",
    },
  };
  if (profile === "tablet") {
    Object.assign(shots.home, { horseX: 0.45, horseScale: 0.9, cameraZ: 7.4 });
    Object.assign(shots.journey, {
      horseX: -0.45,
      horseScale: 0.8,
      cameraZ: 7.8,
    });
    Object.assign(shots.compliance, { horseX: 0.85, horseScale: 0.65 });
    Object.assign(shots.care, {
      horseX: -0.6,
      horseY: -1.7,
      horseScale: 1.13,
      cameraZ: 6.7,
      targetX: 0.7,
      targetY: 0.25,
    });
    Object.assign(shots.movement, {
      horseX: 0.45,
      horseScale: 0.77,
      cameraZ: 8.2,
    });
  } else if (profile === "mobile") {
    // Centered stage above copy, not a miniature desktop camera path.
    for (const shot of Object.values(shots)) {
      Object.assign(shot, {
        horseX: 0,
        horseY: -1.2,
        horseZ: 0,
        horseScale: 0.95,
        cameraX: 0,
        cameraY: 0.45,
        cameraZ: 7.4,
        targetY: 0,
        keyLight: 3.4,
        rimLight: 1.3,
      });
    }
    Object.assign(shots.home, { horseYaw: -0.28 });
    Object.assign(shots.journey, { horseX: 0.15, horseYaw: 0.04 });
    Object.assign(shots.compliance, { horseX: 0.4, horseScale: 0.7 });
    Object.assign(shots.platform, { horseX: 3.8, horsePresence: 0 });
    Object.assign(shots.care, {
      horseX: -0.35,
      horseY: -1.6,
      horseScale: 1.08,
      horseYaw: 2.65,
      cameraZ: 7.8,
      targetX: 0.65,
      targetY: 0.35,
    });
    Object.assign(shots.movement, { horseX: 0.3, horseYaw: 0.04 });
    Object.assign(shots.about, { horseX: -3.8, horseYaw: 0.04 });
  }
  if (reduced) {
    const staticShot = {
      ...shots.home,
      horseYaw: -0.28,
      motion: "idle" as const,
    };
    for (const chapter of Object.keys(shots) as LandingChapter[]) {
      shots[chapter] = {
        ...staticShot,
        horsePresence: chapter === "platform" || chapter === "about" ? 0 : 1,
      };
    }
  }
  return shots;
}

export function createLandingStory(
  profile: StoryProfile,
  reducedMotion: boolean,
): LandingSceneState {
  return {
    ...getHorseShots(profile, reducedMotion).home,
    profile,
    reducedMotion,
    pointerX: 0,
    pointerY: 0,
    lowPower: profile !== "desktop",
    visible: true,
    playbackRate: 1,
    lastScrollAt: 0,
    rawProgress: 0,
    storyProgress: 0,
    introScale: reducedMotion ? 1 : 0.78,
    introZ: reducedMotion ? 0 : -1.6,
  };
}

export function resolveMotionCue(
  time: number,
  cues: readonly MotionCue[],
  currentIndex: number,
  margin: number,
) {
  if (!cues.length || !Number.isFinite(time)) return 0;
  let index = Math.max(0, Math.min(cues.length - 1, currentIndex));
  const hysteresis = Math.max(0, margin);
  while (index < cues.length - 1 && time >= cues[index + 1].at + hysteresis)
    index++;
  while (index > 0 && time < cues[index].at - hysteresis) index--;
  return index;
}
