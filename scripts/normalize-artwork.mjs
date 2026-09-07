import { readdir, rename, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const check = process.argv.includes("--check");
const root = path.resolve("artwork");
const preferredLimit = 150 * 1024;

async function listWebp(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await listWebp(target));
    else if (/\.webp$/i.test(entry.name)) output.push(target);
  }
  return output;
}

let changed = 0;
let oversize = 0;
for (const file of await listWebp(root)) {
  const metadata = await sharp(file).metadata();
  const size = (await stat(file)).size;
  if (metadata.width === 512 && metadata.height === 512 && size <= preferredLimit) continue;
  if (check) {
    if (metadata.width !== 512 || metadata.height !== 512) console.error(`${path.relative(root, file)}: ${metadata.width}x${metadata.height}`);
    if (size > preferredLimit) console.error(`${path.relative(root, file)}: ${Math.ceil(size / 1024)} KiB`);
    changed++;
    continue;
  }
  const temporary = `${file}.tmp.webp`;
  await sharp(file)
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 82, alphaQuality: 90, effort: 6 })
    .toFile(temporary);
  const nextSize = (await stat(temporary)).size;
  if (nextSize > preferredLimit) oversize++;
  await rename(temporary, file);
  changed++;
}

console.log(`${check ? "Found" : "Normalized"} ${changed} artwork file(s); ${oversize} remain above 150 KiB.`);
if (check && changed) process.exitCode = 1;
