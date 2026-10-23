import {
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Euler,
  Quaternion,
  PerspectiveCamera,
  Vector3,
  Plane,
  Ray,
  CatmullRomCurve3,
  type Group,
  type DirectionalLight,
  type HemisphereLight,
  type PointLight,
} from "three";
import type { LandingSceneState } from "../../lib/horse-story";
import { getHeroRevealProgress } from "../../lib/horse-animation";
import { HoofContactLights } from "./HoofContactLights";

export function HorseScene({
  story,
  children,
  lowPower,
  onContextLost,
}: {
  story: RefObject<LandingSceneState>;
  children: ReactNode;
  lowPower: boolean;
  onContextLost: () => void;
}) {
  const world = useRef<Group>(null);
  const key = useRef<DirectionalLight>(null);
  const rim = useRef<DirectionalLight>(null);
  const ambient = useRef<HemisphereLight>(null);
  const fill = useRef<DirectionalLight>(null);
  const hoofLight = useRef<PointLight>(null);
  const revision = useRef(-1);
  const heroAnchorReady = useRef(false);
  const invalidate = useThree((state) => state.invalidate);
  const canvas = useThree((state) => state.gl.domElement);
  useEffect(() => {
    canvas.addEventListener("webglcontextlost", onContextLost, { once: true });
    return () => canvas.removeEventListener("webglcontextlost", onContextLost);
  }, [canvas, onContextLost]);
  useEffect(() => {
    const state = story.current;
    Object.assign(state, { invalidate });
    invalidate();
    return () => {
      if (state.invalidate === invalidate)
        Object.assign(state, { invalidate: undefined });
    };
  }, [story, invalidate]);
  const scratch = useMemo(
    () => ({
      yaw: new Euler(),
      rotation: new Quaternion(),
      look: new Vector3(),
      target: new Vector3(),
      pointer: new Vector3(),
      rimPos: new Vector3(-4, 3, -3),
      keyPos: new Vector3(3, 5, 4),
      head: new Vector3(),
      hoof: new Vector3(),
      route: new Vector3(),
      tangent: new Vector3(),
      ray: new Ray(),
      ground: new Plane(new Vector3(0, 1, 0), 0),
      cameraPath: new CatmullRomCurve3([
        new Vector3(0.2, 0.5, 3.2),
        new Vector3(0.1, 0.85, 3.6),
        new Vector3(0, 1.45, 4.2),
        new Vector3(0, 2.1, 4.8),
        new Vector3(0, 1.45, 5.5),
        new Vector3(0, 0.9, 7),
      ]),
      lookPath: new CatmullRomCurve3([
        new Vector3(0, 0.25, 0),
        new Vector3(0, 0.5, 0),
        new Vector3(0, 1.2, 0),
        new Vector3(0, 1.85, 0),
        new Vector3(0, 1.3, 0),
        new Vector3(0, 1.05, 0),
      ]),
      cameraPoint: new Vector3(),
      heroCameraOffset: new Vector3(),
      heroLookOffset: new Vector3(),
      heroAnchor: new Vector3(),
    }),
    [],
  );
  useFrame(({ camera, size }, elapsed) => {
    if (!world.current) return;
    const state = story.current;
    const delta = Math.min(elapsed, 0.05);
    const snap = revision.current !== state.shotVersion;
    revision.current = state.shotVersion;
    const alpha =
      snap || state.reducedMotion
        ? 1
        : 1 - Math.exp(-(state.inHero ? 7 : 10) * delta);
    if (!state.inHero) heroAnchorReady.current = false;
    const parallax =
      state.inHero &&
      state.heroPhase === "FINAL_POSE" &&
      !state.reducedMotion &&
      !state.lowPower &&
      state.profile === "desktop"
        ? 1
        : 0;
    const damp = 1 - Math.exp(-4 * delta);
    scratch.pointer.lerp(
      scratch.target.set(
        state.pointerX * parallax,
        state.pointerY * parallax,
        0,
      ),
      damp,
    );
    if (snap || !parallax) scratch.pointer.set(0, 0, 0);
    const tiltX = scratch.pointer.x * 0.12;
    const tiltY = scratch.pointer.y * 0.07;
    const reveal =
      state.inHero && !state.reducedMotion
        ? getHeroRevealProgress(state.heroRevealTime)
        : 1;
    const light = reveal * reveal * (3 - 2 * reveal);
    if (ambient.current)
      ambient.current.intensity = state.inHero ? 0.2 + light * 1.4 : 1.6;
    if (fill.current)
      fill.current.intensity = state.inHero ? 0.05 + light * 0.6 : 0.65;
    if (hoofLight.current) {
      hoofLight.current.intensity =
        state.inHero && !state.reducedMotion ? 0.25 * (1 - light) : 0;
      hoofLight.current.position.set(
        state.heroHoof.x,
        state.heroHoof.y + 0.2,
        state.heroHoof.z + 0.2,
      );
    }
    if (rim.current) {
      scratch.rimPos.set(
        -4 + scratch.pointer.x * 0.7,
        3 + scratch.pointer.y * 0.4,
        -3,
      );
      rim.current.position.lerp(scratch.rimPos, damp);
      rim.current.intensity +=
        ((state.inHero
          ? 0.25 + light * (state.rimLight - 0.25)
          : state.rimLight) -
          rim.current.intensity) *
        alpha;
    }
    if (key.current) {
      scratch.keyPos.set(
        3 + scratch.pointer.x * 0.4,
        5 + scratch.pointer.y * 0.25,
        4,
      );
      key.current.position.lerp(scratch.keyPos, damp);
      key.current.intensity +=
        ((state.inHero
          ? 0.5 + light * (state.keyLight - 0.5)
          : state.keyLight) -
          key.current.intensity) *
        alpha;
    }
    if (state.inMap) {
      camera.position.set(state.cameraX, state.cameraY, state.cameraZ);
      scratch.look.set(state.targetX, state.targetY, state.targetZ);
      camera.lookAt(scratch.look);
      camera.updateMatrixWorld();
      scratch.route
        .set(
          (state.mapScreenX / size.width) * 2 - 1,
          1 - (state.mapScreenY / size.height) * 2,
          0.5,
        )
        .unproject(camera);
      scratch.ray.origin.copy(camera.position);
      scratch.ray.direction
        .copy(scratch.route)
        .sub(camera.position)
        .normalize();
      if (!scratch.ray.intersectPlane(scratch.ground, scratch.route)) return;
      scratch.tangent
        .set(
          ((state.mapScreenX + state.mapTangentX) / size.width) * 2 - 1,
          1 - ((state.mapScreenY + state.mapTangentY) / size.height) * 2,
          0.5,
        )
        .unproject(camera);
      scratch.ray.direction
        .copy(scratch.tangent)
        .sub(camera.position)
        .normalize();
      if (!scratch.ray.intersectPlane(scratch.ground, scratch.tangent)) return;
      scratch.tangent.sub(scratch.route);
      scratch.yaw.set(0, Math.atan2(scratch.tangent.z, -scratch.tangent.x), 0);
      scratch.rotation.setFromEuler(scratch.yaw);
      world.current.position.copy(scratch.route);
      world.current.quaternion.slerp(
        scratch.rotation,
        snap ? 1 : 1 - Math.exp(-18 * delta),
      );
      scratch.head.copy(scratch.route).y += 1;
      scratch.head.project(camera);
      scratch.hoof.copy(scratch.route).project(camera);
      const pixelsPerUnit =
        (Math.abs(scratch.head.y - scratch.hoof.y) * size.height) / 2;
      world.current.scale.setScalar(
        state.mapHorseHeight / (2.4 * Math.max(1, pixelsPerUnit)),
      );
      return;
    }
    const composition = 1;
    const framedX =
      (state.inHero || state.inJourney) &&
      state.profile === "desktop" &&
      camera instanceof PerspectiveCamera
        ? (state.horseX * camera.aspect) / (16 / 9)
        : state.horseX;
    const position = world.current.position;
    position.x +=
      (framedX +
        (state.inHero
          ? state.introX
          : state.inJourney
            ? state.journeyOffsetX
            : 0) -
        position.x) *
      composition;
    position.y += (state.horseY - position.y) * composition;
    position.z +=
      (state.horseZ +
        (state.inHero
          ? state.introZ
          : state.inJourney
            ? state.journeyOffsetZ
            : 0) -
        position.z) *
      composition;
    scratch.yaw.set(0, state.inJourney ? state.journeyYaw : state.horseYaw, 0);
    scratch.rotation.setFromEuler(scratch.yaw);
    world.current.quaternion.slerp(scratch.rotation, composition);
    world.current.scale.setScalar(
      world.current.scale.x +
        (state.horseScale - world.current.scale.x) * composition,
    );
    if (state.inJourney && camera instanceof PerspectiveCamera) {
      const compact = state.profile !== "desktop";
      const distance = compact ? Math.max(6.4, 5.3 / camera.aspect) : 6.5;
      const trackX = framedX + state.journeyOffsetX * 0.35;
      scratch.cameraPoint.set(
        trackX,
        position.y + (compact ? 1.23 : 1.1),
        distance + state.journeyOffsetZ * 0.35,
      );
      scratch.target.set(
        trackX,
        position.y + (compact ? 1.18 : 1.05),
        position.z * 0.4,
      );
      const shift = compact
        ? 0
        : (scratch.cameraPoint.z - position.z) *
          Math.tan((camera.fov * Math.PI) / 360) *
          camera.aspect *
          0.46;
      scratch.cameraPoint.setX(scratch.cameraPoint.x + shift);
      scratch.target.setX(scratch.target.x + shift);
      camera.position.copy(scratch.cameraPoint);
      scratch.look.copy(scratch.target);
      camera.lookAt(scratch.look);
      return;
    }
    if (
      state.inHero &&
      !state.reducedMotion &&
      !state.heroCameraReady &&
      camera instanceof PerspectiveCamera
    ) {
      const compact = state.profile !== "desktop";
      const progress = getHeroRevealProgress(state.heroRevealTime);
      const eased = progress * progress * (3 - 2 * progress);
      scratch.cameraPath.getPoint(eased, scratch.cameraPoint);
      scratch.lookPath.getPoint(eased, scratch.target);
      scratch.heroCameraOffset.set(
        state.heroHoof.x,
        state.heroHoof.y,
        state.heroHoof.z,
      );
      scratch.heroLookOffset.copy(position);
      scratch.heroCameraOffset.lerp(scratch.heroLookOffset, eased);
      const initial = !heroAnchorReady.current || !state.heroIntroReady;
      if (initial) scratch.heroAnchor.copy(scratch.heroCameraOffset);
      else
        scratch.heroAnchor.lerp(
          scratch.heroCameraOffset,
          1 - Math.exp(-5 * delta),
        );
      heroAnchorReady.current = true;
      scratch.cameraPoint.add(scratch.heroAnchor);
      scratch.target.add(scratch.heroAnchor);
      const shift = compact
        ? 0
        : (scratch.cameraPoint.z - position.z) *
          Math.tan((camera.fov * Math.PI) / 360) *
          camera.aspect *
          0.46;
      scratch.cameraPoint.setX(scratch.cameraPoint.x - shift);
      scratch.target.setX(scratch.target.x - shift);
      const settle = Math.min(1, Math.max(0, (progress - 0.64) / 0.36));
      const blend = settle * settle * (3 - 2 * settle);
      scratch.cameraPoint.lerp(
        scratch.heroCameraOffset.set(
          state.cameraX,
          state.cameraY,
          state.cameraZ,
        ),
        blend,
      );
      scratch.target.lerp(
        scratch.heroLookOffset.set(state.targetX, state.targetY, state.targetZ),
        blend,
      );
      camera.position.lerp(scratch.cameraPoint, initial ? 1 : alpha);
      scratch.look.lerp(scratch.target, initial ? 1 : alpha);
      camera.lookAt(scratch.look);
      if (progress >= 1) Object.assign(state, { heroCameraReady: true });
      return;
    }
    camera.position.x += (state.cameraX + tiltX - camera.position.x) * alpha;
    camera.position.y += (state.cameraY + tiltY - camera.position.y) * alpha;
    camera.position.z += (state.cameraZ - camera.position.z) * alpha;
    scratch.target.set(state.targetX, state.targetY, state.targetZ);
    scratch.look.lerp(scratch.target, alpha);
    camera.lookAt(scratch.look);
  });
  return (
    <>
      <HoofContactLights story={story} />
      <pointLight
        ref={hoofLight}
        color="#F39200"
        intensity={0}
        distance={3}
        decay={2}
      />
      <hemisphereLight ref={ambient} args={["#f4efe6", "#272522", 1.6]} />
      <directionalLight
        ref={key}
        position={[3, 5, 4]}
        color="#fff1da"
        intensity={3.8}
      />
      <directionalLight
        ref={rim}
        position={[-4, 3, -3]}
        color="#F39200"
        intensity={lowPower ? 1.4 : 2.8}
      />
      {!lowPower && (
        <directionalLight
          ref={fill}
          position={[-2, 1, 5]}
          color="#abb8c2"
          intensity={0.65}
        />
      )}
      <group
        ref={world}
        position={[
          story.current.horseX + story.current.introX,
          story.current.horseY,
          story.current.horseZ + story.current.introZ,
        ]}
      >
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.006, 0]}
          renderOrder={-1}
        >
          <planeGeometry args={[3.4, 1.6]} />
          <shaderMaterial
            transparent
            depthWrite={false}
            vertexShader="varying vec2 shadowUv; void main() { shadowUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }"
            fragmentShader="varying vec2 shadowUv; void main() { float shade = 1.0 - smoothstep(0.05, 0.5, length(shadowUv - 0.5)); gl_FragColor = vec4(0.025, 0.03, 0.02, shade * shade * 0.6); }"
          />
        </mesh>
        {children}
      </group>
    </>
  );
}
