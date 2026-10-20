import {
  HERO_APPROACH_DISTANCE,
  HERO_YAW,
  type HeroPhase,
  type HorseMotion,
} from "./horse-animation";
import { HORSE_CHAPTERS, type LandingChapter } from "./landing-navigation";

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
  inHero: boolean;
  inJourney: boolean;
  heroCompleted: boolean;
  journeyCompleted: boolean;
  journeyTravel: number;
  heroPhase: HeroPhase;
  shotVersion: number;
  invalidate?: () => void;
  stageOffsetY: number;
  clipTop: number;
  clipBottom: number;
  introX: number;
  introZ: number;
};

export function getHorseShots(profile: StoryProfile, reduced: boolean) {
  const compact = profile !== "desktop";
  const home: HorseShot = {
    horsePresence: 1,
    horseX: compact ? 0 : 1.7,
    horseY: -1.2,
    horseZ: 0,
    horseScale: compact ? 0.92 : 1,
    horseYaw: HERO_YAW,
    cameraX: 0,
    cameraY: 0.35,
    cameraZ: compact ? 7.6 : 6.9,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    keyLight: 3.6,
    rimLight: compact ? 1.3 : 2,
    motion: "idle",
  };
  const shots = Object.fromEntries(
    HORSE_CHAPTERS.map((chapter) => [chapter, { ...home, horsePresence: 0 }]),
  ) as Record<LandingChapter, HorseShot>;
  shots.home = home;
  shots.journey = {
    ...home,
    horsePresence: 1,
    horseX: compact ? 0.25 : -1.25,
    horseY: compact ? -1.2 : -1.6,
    horseScale: compact ? 0.8 : 0.55,
    horseYaw: 0.3,
    cameraZ: compact ? 7.8 : 7.5,
    motion: reduced ? "idle" : "walk",
  };
  return shots;
}

export function createLandingStory(
  profile: StoryProfile,
  reducedMotion: boolean,
): LandingSceneState {
  const home = getHorseShots(profile, reducedMotion).home;
  const distance = profile === "desktop" ? HERO_APPROACH_DISTANCE : 0.65;
  return {
    ...home,
    profile,
    reducedMotion,
    pointerX: 0,
    pointerY: 0,
    lowPower: profile !== "desktop",
    visible: true,
    inHero: true,
    inJourney: false,
    heroCompleted: false,
    journeyCompleted: false,
    journeyTravel: 0,
    heroPhase: "LOADING",
    shotVersion: 0,
    stageOffsetY: 0,
    clipTop: 0,
    clipBottom: 0,
    introX: reducedMotion ? 0 : distance * Math.cos(HERO_YAW),
    introZ: reducedMotion ? 0 : -distance * Math.sin(HERO_YAW),
  };
}
