import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh, ShaderMaterial } from "three";
import type { LandingSceneState } from "../../lib/horse-story";

export function HoofContactLights({
  story,
}: {
  story: RefObject<LandingSceneState>;
}) {
  const meshes = useRef<(Mesh | null)[]>([]);
  const uniforms = useMemo(
    () =>
      Array.from({ length: 6 }, () => ({
        fade: { value: 0 },
        phase: { value: 0 },
      })),
    [],
  );
  useFrame(() => {
    const state = story.current;
    state.hoofPulses.forEach((pulse, index) => {
      const mesh = meshes.current[index];
      if (!mesh) return;
      const age = (performance.now() - pulse.born) / 1250;
      mesh.visible =
        state.inHero &&
        state.visible &&
        !state.reducedMotion &&
        age >= 0 &&
        age < 1;
      if (!mesh.visible) return;
      mesh.position.set(pulse.x, pulse.y, pulse.z);
      mesh.scale.setScalar(0.38 + age * 0.52);
      const material = mesh.material as ShaderMaterial;
      material.uniforms.phase.value = age;
      material.uniforms.fade.value = (1 - age) ** 1.6 * 0.8;
    });
  });
  return (
    <>
      {uniforms.map((value, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            meshes.current[index] = mesh;
          }}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
        >
          <planeGeometry args={[1, 1]} />
          <shaderMaterial
            transparent
            depthWrite={false}
            toneMapped={false}
            uniforms={value}
            vertexShader="varying vec2 lightUv; void main(){ lightUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }"
            fragmentShader={`
              uniform float fade;
              uniform float phase;
              varying vec2 lightUv;
              void main() {
                vec2 p = lightUv - 0.5;
                float d = length(p);
                float ring = 1.0 - smoothstep(0.008, 0.025, abs(d - 0.34));
                float echo = 1.0 - smoothstep(0.005, 0.016, abs(d - 0.22));
                float flare = exp(-d * d * 48.0) * (1.0 - phase);
                float halo = (1.0 - smoothstep(0.08, 0.48, d)) * 0.22;
                float alpha = min(1.0, ring * 0.85 + echo * 0.3 + flare + halo);
                gl_FragColor = vec4(243.0 / 255.0, 146.0 / 255.0, 0.0, fade * alpha);
              }
            `}
          />
        </mesh>
      ))}
    </>
  );
}
