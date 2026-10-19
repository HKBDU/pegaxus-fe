import { useMemo, useRef, type ReactNode, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Euler,
  Quaternion,
  Vector3,
  type Group,
  type DirectionalLight,
} from "three";
import type { LandingSceneState } from "../../lib/horse-story";

export function HorseScene({
  story,
  children,
  lowPower,
}: {
  story: RefObject<LandingSceneState>;
  children: ReactNode;
  lowPower: boolean;
}) {
  const world = useRef<Group>(null);
  const key = useRef<DirectionalLight>(null);
  const rim = useRef<DirectionalLight>(null);
  const scratch = useMemo(
    () => ({
      yaw: new Euler(),
      rotation: new Quaternion(),
      look: new Vector3(0, 0, 0),
      pointer: new Vector3(),
      rimPos: new Vector3(-4, 2, -3),
      keyPos: new Vector3(3, 5, 4),
    }),
    [],
  );
  useFrame(({ camera, pointer }, elapsed) => {
    if (!world.current) return;
    const state = story.current;
    const delta = Math.min(elapsed, 0.05);
    const alpha = state.reducedMotion ? 1 : 1 - Math.exp(-10 * delta);

    // Mouse parallax: active in Hero, smoothly attenuated to 0 as scroll reaches 15%
    const rawProgress = state.rawProgress ?? 0;
    const parallaxFactor =
      state.reducedMotion || state.lowPower || state.profile !== "desktop"
        ? 0
        : Math.max(0, 1 - rawProgress / 0.15);

    // Frame-rate-independent pointer damping (easing.damp3 equivalent)
    const dampFactor = 1 - Math.exp(-4 * delta);
    scratch.pointer.x += (pointer.x - scratch.pointer.x) * dampFactor;
    scratch.pointer.y += (pointer.y - scratch.pointer.y) * dampFactor;

    // Subtle camera angle offset (±2° to 3° max, ~0.035 - 0.05 rad)
    const tiltX = scratch.pointer.x * 0.25 * parallaxFactor;
    const tiltY = scratch.pointer.y * 0.15 * parallaxFactor;

    // Dynamic champagne rim light position shifting with pointer
    if (rim.current) {
      scratch.rimPos.set(
        -4 + scratch.pointer.x * 1.5 * parallaxFactor,
        2 + scratch.pointer.y * 1.0 * parallaxFactor,
        -3 + scratch.pointer.x * 0.6 * parallaxFactor,
      );
      rim.current.position.lerp(scratch.rimPos, dampFactor);
    }

    // Dynamic key light subtle specular shift
    if (key.current) {
      scratch.keyPos.set(
        3 + scratch.pointer.x * 0.8 * parallaxFactor,
        5 + scratch.pointer.y * 0.5 * parallaxFactor,
        4,
      );
      key.current.position.lerp(scratch.keyPos, dampFactor);
    }

    // Horse transforms: incorporate on-load forward walk-in intro depth & scale
    const targetScale = state.horseScale * (state.introScale ?? 1);
    const targetZ = state.horseZ + (state.introZ ?? 0);

    const position = world.current.position;
    position.x += (state.horseX - position.x) * alpha;
    position.y += (state.horseY - position.y) * alpha;
    position.z += (targetZ - position.z) * alpha;

    scratch.yaw.set(0, state.horseYaw, 0);
    scratch.rotation.setFromEuler(scratch.yaw);
    world.current.quaternion.slerp(scratch.rotation, alpha);
    world.current.scale.setScalar(
      world.current.scale.x + (targetScale - world.current.scale.x) * alpha,
    );

    // Camera position & lookAt
    camera.position.x +=
      (state.cameraX + tiltX - camera.position.x) * alpha;
    camera.position.y +=
      (state.cameraY + tiltY - camera.position.y) * alpha;
    camera.position.z += (state.cameraZ - camera.position.z) * alpha;

    scratch.look.set(
      scratch.look.x + (state.targetX - scratch.look.x) * alpha,
      scratch.look.y + (state.targetY - scratch.look.y) * alpha,
      scratch.look.z + (state.targetZ - scratch.look.z) * alpha,
    );
    camera.lookAt(scratch.look);

    if (key.current)
      key.current.intensity += (state.keyLight - key.current.intensity) * alpha;
    if (rim.current)
      rim.current.intensity += (state.rimLight - rim.current.intensity) * alpha;
  });
  return (
    <>
      <hemisphereLight args={["#f3e8d7", "#2b302d", 2.1]} />
      <directionalLight
        ref={key}
        position={[3, 5, 4]}
        color="#fff1da"
        intensity={3.8}
      />
      <directionalLight
        ref={rim}
        position={[-4, 2, -3]}
        color="#D7B887"
        intensity={lowPower ? 1.4 : 2.8}
      />
      {!lowPower && (
        <directionalLight
          position={[-2, 1, 5]}
          color="#abb8c2"
          intensity={0.8}
        />
      )}
      <group
        ref={world}
        position={[
          story.current.horseX,
          story.current.horseY,
          story.current.horseZ,
        ]}
      >
        {children}
      </group>
    </>
  );
}
