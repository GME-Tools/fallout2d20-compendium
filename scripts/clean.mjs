import { rm } from "node:fs/promises";

await Promise.all([
  rm("packs-v14", { recursive: true, force: true }),
  rm("dist", { recursive: true, force: true }),
  rm("generated", { recursive: true, force: true })
]);
