import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export async function exists(file) {
  try {
    await readFile(file);
    return true;
  } catch (error) {
    if (error.code === "EISDIR") return true;
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

export async function listFiles(root, predicate = () => true) {
  const output = [];
  async function visit(directory) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(target);
      else if (predicate(target)) output.push(target);
    }
  }
  await visit(root);
  return output;
}

export function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "document";
}
