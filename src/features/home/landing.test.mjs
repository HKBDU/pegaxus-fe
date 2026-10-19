import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { after, test } from "node:test";
import { createServer } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
});
after(() => vite.close());
const load = (path) => vite.ssrLoadModule(`/src/features/home/${path}`);
const source = (path) => readFile(path, "utf8");

test("MainLayout hides application chrome only for exact root without changing its wrapper", async () => {
  const code = await source("src/shared/layouts/MainLayout.tsx");
  assert.match(code, /pathname\s*===\s*["']\/["']/);
  assert.match(code, /useLocation/);
  assert.match(code, /!isLanding\s*&&\s*<Header/);
  assert.match(code, /!isLanding\s*&&\s*<Footer/);
  assert.match(code, /className="flex min-h-screen flex-col"/);
  assert.match(code, /className="min-h-\[calc\(100svh-3rem\)\] flex-none"/);
  assert.doesNotMatch(code, /startsWith/);
});

test("approved semantic mapping uses actual unchanged GLB animation clips", async () => {
  const { HORSE_CLIPS, assertHorseAnimations } = await load(
    "lib/horse-animation.ts",
  );
  const bytes = await readFile("src/features/home/assets/horse.glb");
  const gltf = JSON.parse(
    bytes
      .subarray(20, 20 + bytes.readUInt32LE(12))
      .toString("utf8")
      .trim(),
  );
  assert.equal(gltf.animations.length, 30);
  assert.deepEqual(HORSE_CLIPS, {
    idle: "HorseALL_SlowIdle",
    walk: "HorseALL_SlowWalk",
    run: "HorseALL_RunLoop",
  });
  assertHorseAnimations(gltf.animations);
  assert.throws(() => assertHorseAnimations([]), /Missing horse animation/);
  assert.equal(bytes.length, 44732812);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    "ab4a896662c41e2016213d5f066dce7436a415d469b26936c29cbd95ca3daffb",
  );
});

test("transport CTAs reuse confirmed routes and do not send employees into customer routes", async () => {
  const { getTransportCta, LANDING_NAV_ITEMS } = await load(
    "lib/landing-navigation.ts",
  );
  assert.equal(getTransportCta(false, []).to, "/bookings/new");
  assert.equal(getTransportCta(true, ["CUSTOMER"]).to, "/bookings/new");
  assert.equal(getTransportCta(true, ["LOGISTICS_MANAGER"]).to, "/admin");
  assert.equal(getTransportCta(true, ["TRANSPORT_SPECIALIST"]), null);
  assert.deepEqual(
    LANDING_NAV_ITEMS.map((item) => item.id),
    ["home", "journey", "compliance", "platform", "about"],
  );
});

test("story gives Platform breathing room and brings the horse back for Care", async () => {
  const { getHorseShots } = await load("lib/horse-story.ts");
  assert.equal(
    typeof getHorseShots,
    "function",
    "Cinematic shot definitions must exist",
  );
  for (const profile of ["desktop", "tablet", "mobile"]) {
    const shots = getHorseShots(profile, false);
    assert.equal(shots.home.motion, "idle");
    assert.equal(shots.journey.motion, "walk");
    assert.equal(shots.platform.horsePresence, 0);
    assert.equal(shots.care.horsePresence, 1);
    assert.equal(shots.care.motion, "idle");
    assert.equal(shots.movement.motion, "walk");
    assert.equal(shots.about.motion, "run");
    for (const shot of Object.values(shots)) {
      for (const [key, value] of Object.entries(shot)) {
        if (key !== "motion")
          assert.ok(Number.isFinite(value), `${profile}: ${key}`);
      }
    }
  }
  assert.notDeepEqual(
    getHorseShots("desktop", false).journey,
    getHorseShots("mobile", false).journey,
  );
});

test("reduced motion keeps idle static shots and has no parallax targets", async () => {
  const { getHorseShots, createLandingStory } =
    await load("lib/horse-story.ts");
  assert.equal(
    typeof createLandingStory,
    "function",
    "Mutable story state must exist",
  );
  const state = createLandingStory("mobile", true);
  assert.equal(state.reducedMotion, true);
  assert.equal(state.motion, "idle");
  assert.equal(state.pointerX, 0);
  assert.equal(state.pointerY, 0);
  const shots = getHorseShots("mobile", true);
  for (const shot of Object.values(shots)) assert.equal(shot.motion, "idle");
  assert.equal(shots.platform.horsePresence, 0);
});

test("semantic motion uses hysteresis under scroll reversal, not cooldown", async () => {
  const { resolveMotionCue } = await load("lib/horse-story.ts");
  assert.equal(
    typeof resolveMotionCue,
    "function",
    "Motion hysteresis must exist",
  );
  const cues = [
    { at: 0, motion: "idle" },
    { at: 1, motion: "walk" },
    { at: 2, motion: "run" },
  ];
  assert.equal(resolveMotionCue(1.01, cues, 0, 0.03), 0);
  assert.equal(resolveMotionCue(1.05, cues, 0, 0.03), 1);
  assert.equal(resolveMotionCue(0.99, cues, 1, 0.03), 1);
  assert.equal(resolveMotionCue(0.94, cues, 1, 0.03), 0);
  assert.equal(resolveMotionCue(9, cues, 0, 0.03), 2);
  assert.equal(resolveMotionCue(-1, cues, 2, 0.03), 0);
  assert.equal(resolveMotionCue(NaN, cues, 0, 0.03), 0);
});

test("locomotion phase is retained and velocity only mildly changes leg speed", async () => {
  const { getLocomotionPhase, getPlaybackRate } = await load(
    "lib/horse-animation.ts",
  );
  assert.equal(
    typeof getLocomotionPhase,
    "function",
    "Phase matching must exist",
  );
  assert.equal(getLocomotionPhase(1, 4, 2), 0.5);
  assert.equal(getLocomotionPhase(5, 4, 2), 0.5);
  assert.equal(getLocomotionPhase(-1, 4, 2), 1.5);
  assert.equal(getLocomotionPhase(1, 0, 2), 0);
  assert.equal(getPlaybackRate(0), 1);
  assert.equal(getPlaybackRate(NaN), 1);
  for (const speed of [-1e9, -100, 100, 1e9])
    assert.ok(getPlaybackRate(speed) >= 0.85 && getPlaybackRate(speed) <= 1.15);
});

test("GLB stays external and only one interactive-safe Canvas exists", async () => {
  const code = await source(
    "src/features/home/components/landing/HorseExperience.tsx",
  );
  const model = await source(
    "src/features/home/components/landing/HorseModel.tsx",
  );
  assert.equal((code.match(/<Canvas\b/g) ?? []).length, 1);
  assert.match(model, /horse\.glb\?url&no-inline/);
  assert.match(model, /useGLTF/);
  assert.match(model, /useAnimations/);
  const animation = await source("src/features/home/lib/horse-animation.ts");
  assert.match(animation, /fadeIn/);
  assert.match(animation, /fadeOut/);
  assert.match(model, /stopFading/);
  assert.doesNotMatch(
    code + model,
    /ScrollControls|OrbitControls|SkeletonUtils\.clone/,
  );
  const css = await source("src/features/home/landing.css");
  assert.match(css, /\.landing-experience[\s\S]*?pointer-events:\s*none/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  const landing = await source(
    "src/features/home/components/landing/PegaxusLanding.tsx",
  );
  assert.match(landing, /scrollIntoView/);
  assert.match(landing, /prefers-reduced-motion/);
});

test("switching reduced motion during a fade leaves only a static Idle pose", async () => {
  const { transitionHorseAction, HORSE_CLIPS } = await load(
    "lib/horse-animation.ts",
  );
  assert.equal(typeof transitionHorseAction, "function");
  const { Object3D, AnimationMixer, AnimationClip, NumberKeyframeTrack } =
    await import("three");
  const root = new Object3D();
  const mixer = new AnimationMixer(root);
  const idle = mixer.clipAction(
    new AnimationClip(HORSE_CLIPS.idle, 3, [
      new NumberKeyframeTrack(".position[x]", [0, 3], [0, 0]),
    ]),
  );
  const walk = mixer.clipAction(
    new AnimationClip(HORSE_CLIPS.walk, 4, [
      new NumberKeyframeTrack(".position[x]", [0, 4], [10, 10]),
    ]),
  );
  const run = mixer.clipAction(
    new AnimationClip(HORSE_CLIPS.run, 2, [
      new NumberKeyframeTrack(".position[x]", [0, 2], [20, 20]),
    ]),
  );
  walk.play();
  mixer.update(0.5);
  transitionHorseAction(run, walk, false, 1);
  assert.equal(run.time, 0.25, "Walk to Run keeps normalized phase");
  mixer.update(0.1);
  transitionHorseAction(idle, run, true, 1);
  mixer.timeScale = 0;
  mixer.update(0);
  assert.equal(root.position.x, 0);
  assert.equal(walk.isRunning(), false);
  assert.equal(run.isRunning(), false);
  for (let i = 0; i < 60; i++) mixer.update(1 / 60);
  assert.equal(root.position.x, 0);
  mixer.timeScale = 1;
  walk.reset().play();
  mixer.update(0.5);
  transitionHorseAction(idle, walk, false, 1);
  mixer.update(0.1);
  // Preference can change while semantic state is ALREADY Idle but an outgoing
  // Walk is still fading. That outgoing contribution must also disappear.
  transitionHorseAction(idle, idle, true, 1);
  mixer.timeScale = 0;
  mixer.update(0);
  assert.equal(root.position.x, 0);
  assert.equal(walk.isRunning(), false);
});

test("legacy material adapter restores diffuse and glossiness texture semantics", async () => {
  const { createHorseMaterialPlugin } = await load("lib/horse-materials.ts");
  const { Texture, MeshPhysicalMaterial } = await import("three");
  const assigned = [];
  const parser = {
    json: {
      materials: [
        {
          extensions: {
            KHR_materials_pbrSpecularGlossiness: {
              diffuseFactor: [0.8, 0.7, 0.6, 1],
              diffuseTexture: { index: 0 },
              specularFactor: [0.14, 0.14, 0.14],
              glossinessFactor: 0.89,
              specularGlossinessTexture: { index: 2 },
            },
          },
        },
      ],
    },
    async assignTexture(params, name, definition) {
      assigned.push([name, definition.index]);
      params[name] = new Texture();
    },
  };
  const plugin = createHorseMaterialPlugin(parser);
  assert.equal(plugin.name, "KHR_materials_pbrSpecularGlossiness");
  assert.equal(plugin.getMaterialType(0), MeshPhysicalMaterial);
  assert.equal(plugin.getMaterialType(1), null);
  const params = {};
  await plugin.extendMaterialParams(0, params);
  assert.equal(params.metalness, 0);
  assert.ok(Math.abs(params.roughness - 0.11) < 1e-9);
  for (const name of ["map", "specularColorMap", "roughnessMap"])
    assert.ok(assigned.some(([assignedName]) => assignedName === name));
  const shader = {
    uniforms: {},
    fragmentShader: "#include <roughnessmap_fragment>",
  };
  params.onBeforeCompile(shader);
  assert.match(shader.fragmentShader, /\.a/);
  assert.doesNotMatch(shader.fragmentShader, /texelRoughness\.g/);
});

test("editorial DOM renders real navigation targets without waiting for WebGL", async () => {
  const { MemoryRouter } = await import("react-router-dom");
  const { PegaxusLanding } = await load(
    "components/landing/PegaxusLanding.tsx",
  );
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(PegaxusLanding),
    ),
  );
  for (const id of [
    "home",
    "journey",
    "compliance",
    "platform",
    "care",
    "movement",
    "about",
  ])
    assert.ok(html.includes(`id="${id}"`));
  for (const text of [
    "Move champions",
    "beyond borders.",
    'href="/bookings/new"',
    'href="/login"',
    "Preparing the journey",
    "Skip to content",
  ])
    assert.ok(html.includes(text));
  assert.doesNotMatch(
    html,
    /href="#"|href="\/privacy"|href="\/terms"|Count is|Get started/,
  );
});
