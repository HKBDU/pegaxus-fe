import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// Turned handle profile (radius, height), bottom to top.
const HANDLE = [
  [0.44, 1.38],
  [0.42, 1.5],
  [0.3, 1.66],
  [0.24, 1.9],
  [0.25, 2.25],
  [0.34, 2.5],
  [0.56, 2.72],
  [0.66, 2.95],
  [0.62, 3.16],
  [0.46, 3.32],
  [0.24, 3.41],
  [0, 3.44],
].map(([r, y]) => new THREE.Vector2(r, y));

/** Procedural varnished wood grain, generated once per material. */
function woodTexture(base: string, grain: string) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d")!;
  context.fillStyle = base;
  context.fillRect(0, 0, 256, 256);
  context.strokeStyle = grain;
  for (let line = 0; line < 46; line++) {
    const x0 = line * 5.6 + Math.sin(line * 1.7) * 3;
    context.globalAlpha = 0.18 + ((line * 37) % 10) / 40;
    context.lineWidth = 0.6 + ((line * 13) % 5) / 3;
    context.beginPath();
    for (let y = 0; y <= 256; y += 8)
      context.lineTo(x0 + Math.sin(y / 38 + line) * 4, y);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Local studio reflections (no HDR download). */
function Studio() {
  const gl = useThree((state) => state.gl);
  const environment = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return texture;
  }, [gl]);
  useEffect(() => () => environment.dispose(), [environment]);
  return <Environment map={environment} />;
}

// Camera azimuth: at this yaw the long face of the block looks at the viewer.
const FACE = Math.atan2(3.4, 4.6);

/** Yaw follows the `--spin` (turns) GSAP writes on the stamp tool element. */
function Stamp({ tool }: { tool: HTMLElement | null }) {
  const group = useRef<THREE.Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    if (!tool) return;
    const observer = new MutationObserver(() => invalidate());
    observer.observe(tool, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, [tool, invalidate]);
  useFrame(() => {
    const spin = Number(tool?.style.getPropertyValue("--spin")) || 0;
    if (group.current) group.current.rotation.y = FACE + spin * Math.PI * 2;
  });
  const materials = useMemo(
    () => ({
      handle: new THREE.MeshPhysicalMaterial({
        map: woodTexture("#9a6534", "#4a2a12"),
        roughness: 0.42,
        clearcoat: 0.6,
        clearcoatRoughness: 0.25,
      }),
      block: new THREE.MeshPhysicalMaterial({
        map: woodTexture("#7b4a24", "#3a1f0c"),
        roughness: 0.5,
        clearcoat: 0.45,
        clearcoatRoughness: 0.3,
      }),
      metal: new THREE.MeshStandardMaterial({
        color: "#c9c1b3",
        metalness: 1,
        roughness: 0.28,
      }),
      rubber: new THREE.MeshStandardMaterial({
        color: "#1c1a18",
        roughness: 0.92,
      }),
      ink: new THREE.MeshStandardMaterial({
        color: "#c96f00",
        roughness: 0.55,
      }),
    }),
    [],
  );
  useEffect(
    () => () =>
      Object.values(materials).forEach((material) => {
        material.map?.dispose();
        material.dispose();
      }),
    [materials],
  );
  return (
    <group ref={group} rotation={[0, FACE, 0]}>
      <mesh material={materials.handle} castShadow>
        <latheGeometry args={[HANDLE, 48]} />
      </mesh>
      <mesh material={materials.metal} position={[0, 1.36, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.14, 48]} />
      </mesh>
      <RoundedBox
        args={[2.5, 0.68, 1.45]}
        radius={0.1}
        smoothness={4}
        position={[0, 0.95, 0]}
        material={materials.block}
      />
      <mesh material={materials.metal} position={[0, 0.58, 0]}>
        <boxGeometry args={[2.42, 0.06, 1.37]} />
      </mesh>
      <mesh material={materials.rubber} position={[0, 0.46, 0]}>
        <boxGeometry args={[2.36, 0.18, 1.31]} />
      </mesh>
      <mesh material={materials.ink} position={[0, 0.355, 0]}>
        <boxGeometry args={[2.3, 0.03, 1.25]} />
      </mesh>
    </group>
  );
}

/**
 * Photoreal rubber stamp rendered with three.js. Mounted only near the
 * viewport and rendered on demand; GSAP moves the wrapping element.
 */
export default function StampModel() {
  const host = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [tool, setTool] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const element = host.current;
    if (!element || matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const observer = new IntersectionObserver(
      ([entry]) => setNear(entry.isIntersecting),
      { rootMargin: "60% 0px" },
    );
    setTool(element.parentElement);
    observer.observe(element.parentElement ?? element);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="landing-stamp-model" ref={host}>
      {near && (
        <Canvas
          frameloop="demand"
          dpr={[1, 2]}
          gl={{ alpha: true, antialias: true }}
          camera={{ position: [3.4, 3.1, 4.6], fov: 30 }}
          onCreated={({ camera }) => camera.lookAt(0, 1.75, 0)}
        >
          <Studio />
          <ambientLight intensity={0.25} />
          <directionalLight position={[4, 6, 3]} intensity={2.2} />
          <directionalLight
            position={[-4, 2, -2]}
            intensity={0.6}
            color="#ffd9a8"
          />
          <Stamp tool={tool} />
        </Canvas>
      )}
    </div>
  );
}
