import { cp, copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { ZipFile } from "yazl";
import { listFiles } from "./lib/files.mjs";

const moduleId = "fallout2d20-compendium";
const dist = path.resolve("dist");
const stage = path.join(dist, moduleId);
await rm(dist, { recursive: true, force: true });
await mkdir(stage, { recursive: true });

for (const entry of ["module.json", "README.md", "CHANGELOG.md", "lang", "packs-v14", "runtime"]) {
  await cp(entry, path.join(stage, entry), { recursive: true });
}
for (const file of await listFiles("artwork", file => /\.(?:jpe?g|png|svg|webp)$/i.test(file))) {
  const target = path.join(stage, file);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(file, target);
}
await cp("module.json", path.join(dist, "module.json"));

const archivePath = path.join(dist, `${moduleId}.zip`);
const archive = new ZipFile();
for (const file of await listFiles(stage)) {
  const relative = path.relative(dist, file).split(path.sep).join("/");
  archive.addFile(file, relative);
}
await new Promise((resolve, reject) => {
  archive.outputStream.pipe(createWriteStream(archivePath)).on("close", resolve).on("error", reject);
  archive.end();
});

const manifest = JSON.parse(await readFile("module.json", "utf8"));
await writeFile(path.join(dist, "release.json"), `${JSON.stringify({ id: moduleId, version: manifest.version }, null, 2)}\n`);
console.log(`Created dist/${moduleId}.zip.`);
