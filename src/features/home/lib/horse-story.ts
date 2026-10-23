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
  inMap: boolean;
  heroCompleted: boolean;
  journeyCompleted: boolean;
  journeyTravel: number;
  journeyDistance: number;
  journeyReady: boolean;
  journeyTime: number;
  mapProgress: number;
  mapScreenX: number;
  mapScreenY: number;
  mapTangentX: number;
  mapTangentY: number;
  mapRunning: boolean;
  mapUpdatedAt: number;
  mapRunRate: number;
  mapHorseHeight: number;
  mapFrameAt: number;
  mapViewportTop: number;
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
    horseX: compact ? 0 : -2.5,
    horseY: -1.15,
    horseScale: compact ? 0.86 : 0.84,
    // The camera reveals a lateral portrait, not another Hero approach.
    horseYaw: 0.28,
    cameraZ: 9.8,
    motion: reduced ? "idle" : "walk",
  };
  shots.movement = {
    ...home,
    horsePresence: 1,
    horseX: 0,
    horseY: 0,
    horseZ: 0,
    horseScale: 0.3,
    cameraY: 7,
    cameraZ: 9,
    motion: reduced ? "idle" : "run",
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
    inMap: false,
    heroCompleted: false,
    journeyCompleted: false,
    journeyTravel: 0,
    journeyDistance: 0,
    journeyReady: false,
    journeyTime: 0,
    mapProgress: 0,
    mapScreenX: 0,
    mapScreenY: 0,
    mapTangentX: 1,
    mapTangentY: 0,
    mapRunning: false,
    mapUpdatedAt: 0,
    mapRunRate: 1,
    mapHorseHeight: 70,
    mapFrameAt: 0,
    mapViewportTop: 0,
    heroPhase: "LOADING",
    shotVersion: 0,
    stageOffsetY: 0,
    clipTop: 0,
    clipBottom: 0,
    introX: reducedMotion ? 0 : distance * Math.cos(HERO_YAW),
    introZ: reducedMotion ? 0 : -distance * Math.sin(HERO_YAW),
  };
}
