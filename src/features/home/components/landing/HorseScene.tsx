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
  type Group,
  type DirectionalLight,
} from "three";
import type { LandingSceneState } from "../../lib/horse-story";

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
    }),
    [],
  );
  useFrame(({ camera }, elapsed) => {
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
    if (rim.current) {
      scratch.rimPos.set(
        -4 + scratch.pointer.x * 0.7,
        3 + scratch.pointer.y * 0.4,
        -3,
      );
      rim.current.position.lerp(scratch.rimPos, damp);
      rim.current.intensity += (state.rimLight - rim.current.intensity) * alpha;
    }
    if (key.current) {
      scratch.keyPos.set(
        3 + scratch.pointer.x * 0.4,
        5 + scratch.pointer.y * 0.25,
        4,
      );
      key.current.position.lerp(scratch.keyPos, damp);
      key.current.intensity += (state.keyLight - key.current.intensity) * alpha;
    }
    const composition = snap || state.inHero ? 1 : alpha;
    const framedX =
      state.inHero &&
      state.profile === "desktop" &&
      camera instanceof PerspectiveCamera
        ? (state.horseX * camera.aspect) / (16 / 9)
        : state.horseX;
    const position = world.current.position;
    position.x +=
      (framedX + (state.inHero ? state.introX : 0) - position.x) * composition;
    position.y += (state.horseY - position.y) * composition;
    position.z +=
      (state.horseZ + (state.inHero ? state.introZ : 0) - position.z) *
      composition;
    scratch.yaw.set(0, state.horseYaw, 0);
    scratch.rotation.setFromEuler(scratch.yaw);
    world.current.quaternion.slerp(scratch.rotation, composition);
    world.current.scale.setScalar(
      world.current.scale.x +
        (state.horseScale - world.current.scale.x) * composition,
    );
    camera.position.x += (state.cameraX + tiltX - camera.position.x) * alpha;
    camera.position.y += (state.cameraY + tiltY - camera.position.y) * alpha;
    camera.position.z += (state.cameraZ - camera.position.z) * alpha;
    scratch.target.set(state.targetX, state.targetY, state.targetZ);
    scratch.look.lerp(scratch.target, alpha);
    camera.lookAt(scratch.look);
  });
  return (
    <>
      <hemisphereLight args={["#f3e8d7", "#20291f", 1.6]} />
      <directionalLight
        ref={key}
        position={[3, 5, 4]}
        color="#fff1da"
        intensity={3.8}
      />
      <directionalLight
        ref={rim}
        position={[-4, 3, -3]}
        color="#D7B887"
        intensity={lowPower ? 1.4 : 2.8}
      />
      {!lowPower && (
        <directionalLight
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
