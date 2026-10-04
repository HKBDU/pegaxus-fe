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
    }),
    [],
  );
  useFrame(({ camera }, elapsed) => {
    if (!world.current) return;
    const state = story.current;
    const delta = Math.min(elapsed, 0.05);
    const alpha = state.reducedMotion ? 1 : 1 - Math.exp(-10 * delta);
    const pointerScale =
      state.reducedMotion || state.lowPower || state.profile !== "desktop"
        ? 0
        : 0.065;
    scratch.pointer.set(
      scratch.pointer.x +
        (state.pointerX * pointerScale - scratch.pointer.x) * alpha,
      scratch.pointer.y +
        (state.pointerY * pointerScale - scratch.pointer.y) * alpha,
      0,
    );
    const position = world.current.position;
    position.x += (state.horseX - position.x) * alpha;
    position.y += (state.horseY - position.y) * alpha;
    position.z += (state.horseZ - position.z) * alpha;
    scratch.yaw.set(0, state.horseYaw, 0);
    scratch.rotation.setFromEuler(scratch.yaw);
    world.current.quaternion.slerp(scratch.rotation, alpha);
    world.current.scale.setScalar(
      world.current.scale.x +
        (state.horseScale - world.current.scale.x) * alpha,
    );
    camera.position.x +=
      (state.cameraX + scratch.pointer.x - camera.position.x) * alpha;
    camera.position.y +=
      (state.cameraY + scratch.pointer.y - camera.position.y) * alpha;
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
        color="#eebd79"
        intensity={lowPower ? 1.3 : 2.6}
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
