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
  type ShaderMaterial,
} from "three";
import type { LandingSceneState } from "../../lib/horse-story";
import { HERO_APPROACH_DISTANCE } from "../../lib/horse-animation";

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
  const glow = useRef<ShaderMaterial>(null);
  const revision = useRef(-1);
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
        new Vector3(-0.75, 0.35, 1.9),
        new Vector3(-0.65, 0.7, 2.3),
        new Vector3(-0.7, 1.6, 3.1),
        new Vector3(-0.95, 2.2, 4.1),
        new Vector3(0, 1.65, 6.1),
        new Vector3(0, 1.1, 8.8),
      ]),
      lookPath: new CatmullRomCurve3([
        new Vector3(-0.75, 0.18, 0),
        new Vector3(-0.65, 0.5, 0),
        new Vector3(-0.7, 1.15, 0),
        new Vector3(-0.95, 1.9, 0),
        new Vector3(-0.15, 1.4, 0),
        new Vector3(0, 1.05, 0),
      ]),
      cameraPoint: new Vector3(),
      heroCameraPath: new CatmullRomCurve3([
        new Vector3(0, -0.5, 0.35),
        new Vector3(0, -0.25, 0.15),
        new Vector3(0, 0.55, -0.2),
        new Vector3(0, 0.35, -0.08),
        new Vector3(0, 0, 0),
      ]),
      heroLookPath: new CatmullRomCurve3([
        new Vector3(0, -0.18, 0),
        new Vector3(0, -0.1, 0),
        new Vector3(0, 0.18, 0),
        new Vector3(0, 0.1, 0),
        new Vector3(0, 0, 0),
      ]),
      heroCameraOffset: new Vector3(),
      heroLookOffset: new Vector3(),
      glowUniforms: { strength: { value: 0 } },
    }),
    [],
  );
  useFrame(({ camera, size }, elapsed) => {
    if (!world.current) return;
    const state = story.current;
    const delta = Math.min(elapsed, 0.05);
    const snap = revision.current !== state.shotVersion;
    revision.current = state.shotVersion;
    const alpha = snap || state.reducedMotion ? 1 : 1 - Math.exp(-10 * delta);
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
    const reveal = state.inJourney ? Math.min(1, state.journeyTime / 6.2) : 1;
    const light = reveal * reveal * (3 - 2 * reveal);
    if (ambient.current)
      ambient.current.intensity = state.inJourney ? 0.24 + light * 1.1 : 1.6;
    if (fill.current)
      fill.current.intensity = state.inJourney ? 0.06 + light * 0.4 : 0.65;
    if (hoofLight.current)
      hoofLight.current.intensity = state.inJourney
        ? 0.15 + Math.sin(Math.min(1, state.journeyTime / 1.8) * Math.PI) * 0.45
        : 0;
    if (glow.current)
      glow.current.uniforms.strength.value = state.inJourney
        ? 0.04 + (1 - light) * 0.05
        : 0;
    if (rim.current) {
      scratch.rimPos.set(
        -4 + scratch.pointer.x * 0.7,
        3 + scratch.pointer.y * 0.4,
        -3,
      );
      rim.current.position.lerp(scratch.rimPos, damp);
      rim.current.intensity +=
        ((state.inJourney ? 0.2 + light * 1.9 : state.rimLight) -
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
        ((state.inJourney ? 0.32 + light * 3 : state.keyLight) -
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
            ? (state.journeyDistance - state.journeyTravel) *
              Math.cos(state.horseYaw)
            : 0) -
        position.x) *
      composition;
    position.y += (state.horseY - position.y) * composition;
    position.z +=
      (state.horseZ +
        (state.inHero
          ? state.introZ
          : state.inJourney
            ? -(state.journeyDistance - state.journeyTravel) *
              Math.sin(state.horseYaw)
            : 0) -
        position.z) *
      composition;
    scratch.yaw.set(0, state.horseYaw, 0);
    scratch.rotation.setFromEuler(scratch.yaw);
    world.current.quaternion.slerp(scratch.rotation, composition);
    world.current.scale.setScalar(
      world.current.scale.x +
        (state.horseScale - world.current.scale.x) * composition,
    );
    if (state.inJourney && camera instanceof PerspectiveCamera) {
      const t =
        state.reducedMotion || state.journeyCompleted
          ? 1
          : Math.max(0, Math.min(1, (state.journeyTime - 1.1) / 6.5));
      const eased = t * t * (3 - 2 * t);
      scratch.cameraPath.getPoint(eased, scratch.cameraPoint);
      scratch.lookPath.getPoint(eased, scratch.target);
      const compact = state.profile !== "desktop";
      const distance = compact ? Math.max(6.6, 6 / camera.aspect) : 8;
      scratch.cameraPoint.setZ((scratch.cameraPoint.z * distance) / 8.8);
      const shift = compact
        ? 0
        : scratch.cameraPoint.z *
          Math.tan((camera.fov * Math.PI) / 360) *
          camera.aspect *
          0.46;
      scratch.cameraPoint.add(position);
      scratch.cameraPoint.setX(scratch.cameraPoint.x + shift);
      scratch.target.add(position).setX(scratch.target.x + shift);
      // The shot clock owns this spline; extra camera damping would lag the hoof framing.
      camera.position.copy(scratch.cameraPoint);
      scratch.look.copy(scratch.target);
      camera.lookAt(scratch.look);
      return;
    }
    scratch.heroCameraOffset.set(0, 0, 0);
    scratch.heroLookOffset.set(0, 0, 0);
    if (
      state.inHero &&
      !state.reducedMotion &&
      (state.heroPhase === "LOADING" || state.heroPhase === "APPROACH")
    ) {
      const compact = state.profile !== "desktop";
      const distance = compact ? 0.65 : HERO_APPROACH_DISTANCE;
      // Follow actual approach travel; settle before the first hoof scrape.
      const progress = Math.max(
        0,
        Math.min(
          1,
          (1 - Math.hypot(state.introX, state.introZ) / distance) / 0.85,
        ),
      );
      const eased = progress * progress * (3 - 2 * progress);
      scratch.heroCameraPath.getPoint(eased, scratch.heroCameraOffset);
      scratch.heroLookPath.getPoint(eased, scratch.heroLookOffset);
      if (compact) {
        scratch.heroCameraOffset.multiplyScalar(0.6);
        scratch.heroLookOffset.multiplyScalar(0.6);
      }
    }
    camera.position.x += (state.cameraX + tiltX - camera.position.x) * alpha;
    camera.position.y +=
      (state.cameraY + tiltY + scratch.heroCameraOffset.y - camera.position.y) *
      alpha;
    camera.position.z +=
      (state.cameraZ + scratch.heroCameraOffset.z - camera.position.z) * alpha;
    scratch.target.set(
      state.targetX,
      state.targetY + scratch.heroLookOffset.y,
      state.targetZ,
    );
    scratch.look.lerp(scratch.target, alpha);
    camera.lookAt(scratch.look);
  });
  return (
    <>
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
        <pointLight
          ref={hoofLight}
          position={[-0.65, 0.45, 0.4]}
          color="#F39200"
          intensity={0}
          distance={3}
          decay={2}
        />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.65, 0.008, 0]}>
          <planeGeometry args={[1.5, 1.1]} />
          <shaderMaterial
            ref={glow}
            transparent
            depthWrite={false}
            uniforms={scratch.glowUniforms}
            vertexShader="varying vec2 lightUv; void main() { lightUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }"
            fragmentShader="uniform float strength; varying vec2 lightUv; void main() { float pool = 1.0 - smoothstep(0.0, 0.5, length(lightUv - 0.5)); gl_FragColor = vec4(0.953, 0.573, 0.0, pool * pool * strength); }"
          />
        </mesh>
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
