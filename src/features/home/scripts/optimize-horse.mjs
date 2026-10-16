import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const input = resolve("src/features/home/assets/horse.glb");
const output = resolve(
  process.argv[2] ?? "src/features/home/assets/horse-lite.glb",
);
assert.notEqual(
  input.toLowerCase(),
  output.toLowerCase(),
  "Never overwrite the source GLB",
);
const original = await readFile(input);
assert.equal(original.readUInt32LE(0), 0x46546c67);
assert.equal(original.readUInt32LE(4), 2);
const jsonLength = original.readUInt32LE(12);
const source = JSON.parse(
  original
    .subarray(20, 20 + jsonLength)
    .toString("utf8")
    .trim(),
);
assert.equal(
  source.buffers.length,
  1,
  "Only embedded single-buffer assets are supported",
);
assert.ok(!source.buffers[0].uri);
const binStart = 20 + jsonLength + 8;
assert.equal(original.readUInt32LE(binStart - 4), 0x004e4942);
const binary = original.subarray(binStart);
const document = structuredClone(source);
const names = new Set([
  "HorseALL_SlowIdle",
  "HorseALL_Idle3",
  "HorseALL_IdleEars",
  "HorseALL_SlowWalk",
  "HorseALL_RunLoop",
]);
document.animations = document.animations.filter((clip) =>
  names.has(clip.name),
);
assert.equal(document.animations.length, names.size);
const used = new Set();
for (const mesh of document.meshes) {
  for (const primitive of mesh.primitives) {
    for (const index of Object.values(primitive.attributes)) used.add(index);
    if (primitive.indices !== undefined) used.add(primitive.indices);
    for (const target of primitive.targets ?? [])
      for (const index of Object.values(target)) used.add(index);
  }
}
for (const skin of document.skins)
  if (skin.inverseBindMatrices !== undefined)
    used.add(skin.inverseBindMatrices);
for (const clip of document.animations)
  for (const sampler of clip.samplers) {
    used.add(sampler.input);
    used.add(sampler.output);
  }
const widths = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const counts = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const views = [];
const accessors = [];
const accessorMap = new Map();
const chunks = [];
let byteLength = 0;
function append(bytes, target) {
  const padding = (4 - (byteLength % 4)) % 4;
  if (padding) {
    chunks.push(Buffer.alloc(padding));
    byteLength += padding;
  }
  const index = views.length;
  views.push({
    buffer: 0,
    byteOffset: byteLength,
    byteLength: bytes.length,
    ...(target ? { target } : {}),
  });
  chunks.push(bytes);
  byteLength += bytes.length;
  return index;
}
function accessorBytes(index) {
  const accessor = source.accessors[index];
  assert.ok(
    !accessor.sparse && !accessor.extensions,
    "Unsupported accessor encoding",
  );
  const view = source.bufferViews[accessor.bufferView];
  assert.ok(
    view && !view.extensions && view.buffer === 0,
    "Unsupported buffer view",
  );
  const elementWidth = widths[accessor.componentType] * counts[accessor.type];
  assert.ok(
    Number.isFinite(elementWidth),
    "Unsupported matrix/component layout",
  );
  const stride = view.byteStride ?? elementWidth;
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const length = accessor.count * elementWidth;
  assert.ok(
    start + (accessor.count - 1) * stride + elementWidth <= binary.length,
  );
  if (stride === elementWidth) return binary.subarray(start, start + length);
  const result = Buffer.alloc(length);
  for (let row = 0; row < accessor.count; row++) {
    binary.copy(
      result,
      row * elementWidth,
      start + row * stride,
      start + row * stride + elementWidth,
    );
  }
  return result;
}
for (const index of [...used].sort((a, b) => a - b)) {
  const accessor = { ...source.accessors[index] };
  const view = source.bufferViews[accessor.bufferView];
  accessor.bufferView = append(accessorBytes(index), view.target);
  accessor.byteOffset = 0;
  accessorMap.set(index, accessors.length);
  accessors.push(accessor);
}
for (const mesh of document.meshes)
  for (const primitive of mesh.primitives) {
    for (const attribute of Object.keys(primitive.attributes))
      primitive.attributes[attribute] = accessorMap.get(
        primitive.attributes[attribute],
      );
    if (primitive.indices !== undefined)
      primitive.indices = accessorMap.get(primitive.indices);
    for (const target of primitive.targets ?? [])
      for (const attribute of Object.keys(target))
        target[attribute] = accessorMap.get(target[attribute]);
  }
for (const skin of document.skins)
  if (skin.inverseBindMatrices !== undefined)
    skin.inverseBindMatrices = accessorMap.get(skin.inverseBindMatrices);
for (const clip of document.animations)
  for (const sampler of clip.samplers) {
    sampler.input = accessorMap.get(sampler.input);
    sampler.output = accessorMap.get(sampler.output);
  }
for (const image of document.images) {
  assert.ok(
    image.bufferView !== undefined && !image.uri,
    "Only embedded images are supported",
  );
  const view = source.bufferViews[image.bufferView];
  const start = view.byteOffset ?? 0;
  image.bufferView = append(binary.subarray(start, start + view.byteLength));
}
document.accessors = accessors;
document.bufferViews = views;
document.buffers = [{ byteLength }];
const json = Buffer.from(JSON.stringify(document));
const jsonPadded = Buffer.concat([
  json,
  Buffer.alloc((4 - (json.length % 4)) % 4, 0x20),
]);
const bin = Buffer.concat(chunks);
const binPadded = Buffer.concat([
  bin,
  Buffer.alloc((4 - (bin.length % 4)) % 4),
]);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonPadded.length + 8 + binPadded.length, 8);
const jsonHeader = Buffer.alloc(8);
jsonHeader.writeUInt32LE(jsonPadded.length, 0);
jsonHeader.writeUInt32LE(0x4e4f534a, 4);
const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(binPadded.length, 0);
binHeader.writeUInt32LE(0x004e4942, 4);
const lite = Buffer.concat([
  header,
  jsonHeader,
  jsonPadded,
  binHeader,
  binPadded,
]);
// Byte-exact geometry, selected animation samples and images. No resampling,
// recoloring, material conversion or skeleton hierarchy changes.
assert.deepEqual(document.materials, source.materials);
assert.deepEqual(document.nodes, source.nodes);
for (const [before, after] of accessorMap) {
  const view = document.bufferViews[document.accessors[after].bufferView];
  assert.ok(
    accessorBytes(before).equals(
      bin.subarray(view.byteOffset, view.byteOffset + view.byteLength),
    ),
  );
}
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
await writeFile(output, lite);
assert.equal(hash(await readFile(input)), hash(original));
console.log(
  JSON.stringify(
    {
      input,
      output,
      originalBytes: original.length,
      liteBytes: lite.length,
      reductionPercent: (1 - lite.length / original.length) * 100,
      clips: document.animations.map((clip) => clip.name),
      originalSha256: hash(original),
    },
    null,
    2,
  ),
);
