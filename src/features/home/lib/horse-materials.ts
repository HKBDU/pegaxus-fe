import {
  Color,
  LinearSRGBColorSpace,
  MeshPhysicalMaterial,
  SRGBColorSpace,
  type MeshPhysicalMaterialParameters,
} from "three";

const EXTENSION = "KHR_materials_pbrSpecularGlossiness";
type TextureInfo = { index: number; texCoord?: number };
type HorseMaterialParams = MeshPhysicalMaterialParameters &
  Partial<
    Pick<MeshPhysicalMaterial, "onBeforeCompile" | "customProgramCacheKey">
  >;
type LegacyMaterial = {
  diffuseFactor?: [number, number, number, number];
  diffuseTexture?: TextureInfo;
  specularFactor?: [number, number, number];
  glossinessFactor?: number;
  specularGlossinessTexture?: TextureInfo;
};

// Accepts Drei's actual loader without importing its transitive three-stdlib dependency.
type HorseParser = {
  json: {
    materials?: {
      name?: string;
      extensions?: Record<string, LegacyMaterial>;
    }[];
  };
  assignTexture: (
    params: HorseMaterialParams,
    name: string,
    definition: TextureInfo,
    colorSpace?: string,
  ) => Promise<unknown>;
};

export function createHorseMaterialPlugin(parser: HorseParser) {
  const extensionFor = (index: number) =>
    parser.json.materials?.[index]?.extensions?.[EXTENSION];
  return {
    name: EXTENSION,
    getMaterialType(index: number) {
      return extensionFor(index) ? MeshPhysicalMaterial : null;
    },
    async extendMaterialParams(index: number, params: HorseMaterialParams) {
      const legacy = extensionFor(index);
      if (!legacy) return;
      const diffuse = legacy.diffuseFactor ?? [1, 1, 1, 1];
      const specular = legacy.specularFactor ?? [1, 1, 1];
      const glossiness = legacy.glossinessFactor ?? 1;
      params.color = new Color().setRGB(
        diffuse[0],
        diffuse[1],
        diffuse[2],
        LinearSRGBColorSpace,
      );
      params.opacity = diffuse[3];
      params.metalness = 0;
      params.roughness = 1 - glossiness;
      // Approximates legacy F0 using the Physical material's specularColor.
      params.ior = 1000;
      params.specularColor = new Color().setRGB(
        ...specular,
        LinearSRGBColorSpace,
      );
      params.specularIntensity = 1;
      const pending: Promise<unknown>[] = [];
      if (legacy.diffuseTexture)
        pending.push(
          parser.assignTexture(
            params,
            "map",
            legacy.diffuseTexture,
            SRGBColorSpace,
          ),
        );
      if (legacy.specularGlossinessTexture) {
        pending.push(
          parser.assignTexture(
            params,
            "specularColorMap",
            legacy.specularGlossinessTexture,
            SRGBColorSpace,
          ),
        );
        pending.push(
          parser.assignTexture(
            params,
            "roughnessMap",
            legacy.specularGlossinessTexture,
          ),
        );
        // Legacy glossiness is in alpha, not the standard roughness green channel.
        params.onBeforeCompile = (shader) => {
          shader.uniforms.horseGlossiness = { value: glossiness };
          shader.fragmentShader =
            `uniform float horseGlossiness;\n${shader.fragmentShader}`.replace(
              "#include <roughnessmap_fragment>",
              "float roughnessFactor = 1.0 - horseGlossiness;\n#ifdef USE_ROUGHNESSMAP\nroughnessFactor = 1.0 - horseGlossiness * texture2D(roughnessMap, vRoughnessMapUv).a;\n#endif",
            );
        };
        params.customProgramCacheKey = () =>
          "pegaxus-horse-specular-glossiness-v1";
      }
      await Promise.all(pending);
      if (
        parser.json.materials?.[index]?.name === "CH_NPC_MOB_WHorse_A02_MI_BYN"
      ) {
        // Apply after texture awaits: GLTFLoader sets BLEND defaults after invoking plugins.
        // Body and hair cards share this material, so depth alone would occlude the mane.
        params.transparent = false;
        params.depthWrite = true;
        params.alphaTest = 0.5;
      }
      // Loader may share the RGB sRGB / linear-alpha texture between both maps.
      if (params.specularColorMap)
        params.specularColorMap.colorSpace = SRGBColorSpace;
    },
  };
}

export function extendHorseLoader(loader: {
  register: (factory: typeof createHorseMaterialPlugin) => unknown;
}) {
  loader.register(createHorseMaterialPlugin);
}
