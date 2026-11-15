import { useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import horseUrl from "../../assets/horse-meshopt.glb?url&no-inline";
import { HORSE_CLIPS } from "../../lib/horse-animation";
import { extendHorseLoader } from "../../lib/horse-materials";

/** The landing horse, cloned and flattened into a galloping brand silhouette. */
function Gallop() {
  const { scene, animations } = useGLTF(
    horseUrl,
    false,
    false,
    extendHorseLoader,
  );
  const rig = useMemo(() => {
    // Clone: the cached scene belongs to the main HorseExperience canvas.
    const model = clone(scene);
    model.position.set(0, 0, 0);
    const material = new THREE.MeshBasicMaterial({ color: "#f39200" });
    model.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.material = material;
      mesh.frustumCulled = false;
    });
    // Skinned bounds need current bone matrices; measure precisely.
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model, true);
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    const scale = 2 / size.y;
    const mixer = new THREE.AnimationMixer(model);
    mixer
      .clipAction(animations.find((clip) => clip.name === HORSE_CLIPS.run)!)
      .play();
    return { model, material, mixer, scale, centre };
  }, [scene, animations]);
  useEffect(
    () => () => {
      rig.mixer.stopAllAction();
      rig.material.dispose();
    },
    [rig],
  );
  useFrame((_, delta) => rig.mixer.update(Math.min(delta, 0.05) * 1.15));
  return (
    // Side-on, heading to the right of the screen.
    <group rotation={[0, Math.PI, 0]} scale={rig.scale}>
      <primitive
        object={rig.model}
        position={[-rig.centre.x, -rig.centre.y, -rig.centre.z]}
      />
    </group>
  );
}

export default function HorseSilhouette({ running }: { running: boolean }) {
  return (
    <Canvas
      frameloop={running ? "always" : "never"}
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true }}
      camera={{ position: [0, 0, 7], fov: 26 }}
    >
      <Gallop />
    </Canvas>
  );
}
