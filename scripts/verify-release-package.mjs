import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { listFiles } from "./lib/files.mjs";

const moduleId = "fallout2d20-compendium";
const dist = path.resolve("dist");
const stage = path.join(dist, moduleId);
const archivePath = path.join(dist, `${moduleId}.zip`);
const rootManifest = await readFile("module.json", "utf8");
assert.equal(await readFile(path.join(dist, "module.json"), "utf8"), rootManifest, "download manifest differs from module.json");
assert.equal(await readFile(path.join(stage, "module.json"), "utf8"), rootManifest, "archived manifest differs from module.json");

const manifest = JSON.parse(rootManifest);
assert.equal(manifest.id, moduleId);
assert.equal(manifest.compatibility?.minimum, "14");
assert.equal(manifest.compatibility?.verified, "14");
assert.ok(manifest.packs?.length, "manifest has no packs");
for (const pack of manifest.packs) {
  assert.ok((await stat(path.join(stage, pack.path))).isDirectory(), `pack missing from release: ${pack.path}`);
}

// Read ZIP central-directory names without extracting the archive or adding another dependency.
const archive = await readFile(archivePath);
const names = [];
let endOffset = archive.length - 22;
while (endOffset >= 0 && archive.readUInt32LE(endOffset) !== 0x06054b50) endOffset--;
assert.ok(endOffset >= 0, "ZIP end-of-central-directory record is missing");
const entryCount = archive.readUInt16LE(endOffset + 10);
let offset = archive.readUInt32LE(endOffset + 16);
for (let index = 0; index < entryCount; index++) {
  assert.equal(archive.readUInt32LE(offset), 0x02014b50, `invalid ZIP central-directory entry ${index}`);
  const nameLength = archive.readUInt16LE(offset + 28);
  const extraLength = archive.readUInt16LE(offset + 30);
  const commentLength = archive.readUInt16LE(offset + 32);
  names.push(archive.subarray(offset + 46, offset + 46 + nameLength).toString("utf8"));
  offset += 46 + nameLength + extraLength + commentLength;
}
assert.equal(offset, endOffset, "ZIP central-directory length is inconsistent");

const expected = (await listFiles(stage)).map(file => path.relative(dist, file).split(path.sep).join("/"));
assert.deepEqual(names, expected, "ZIP contents differ from the staged release");
assert.ok(names.includes(`${moduleId}/module.json`));
assert.ok(names.includes(`${moduleId}/CHANGELOG.md`));
for (const language of manifest.languages ?? []) {
  assert.ok(names.includes(`${moduleId}/${language.path}`), `localization missing from release: ${language.path}`);
}
assert.ok(names.some(name => name.startsWith(`${moduleId}/packs-v14/`)));
assert.ok(names.every(name => !name.includes("/src/") && !name.includes("/scripts/") && !name.endsWith(".psd")), "development files leaked into ZIP");

console.log(`Verified release archive (${names.length} files, ${Math.ceil(archive.length / 1024 / 1024)} MiB).`);
