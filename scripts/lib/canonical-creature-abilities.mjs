import { readFile } from "node:fs/promises";
import path from "node:path";
import { listFiles } from "./files.mjs";

const MODULE_ID = "fallout2d20-compendium";

function merge(base, override) {
  if (Array.isArray(base) || Array.isArray(override) || !base || !override || typeof base !== "object" || typeof override !== "object") {
    return structuredClone(override);
  }
  const result = structuredClone(base);
  for (const [key, value] of Object.entries(override)) result[key] = key in result ? merge(result[key], value) : structuredClone(value);
  return result;
}

export async function loadCanonicalCreatureAbilities(language) {
  const root = path.resolve("src/packs", language, "creature-abilities.db");
  const files = await listFiles(root, (file) => file.endsWith(".json"));
  const entries = await Promise.all(files.map(async (file) => JSON.parse(await readFile(file, "utf8"))));
  return new Map(entries.map((entry) => [entry._id, entry]));
}

export function materializeCanonicalCreatureAbilities(actor, canonicalById) {
  return {
    ...actor,
    items: (actor.items ?? []).map((embedded) => {
      const canonicalId = embedded.flags?.[MODULE_ID]?.canonicalCreatureAbilityId;
      if (!canonicalId) return embedded;
      const canonical = canonicalById.get(canonicalId);
      if (!canonical) throw new Error(`${actor.name}/${embedded.name}: unknown canonical creature ability ${canonicalId}`);
      if (canonical.type !== embedded.type) throw new Error(`${actor.name}/${embedded.name}: canonical type mismatch for ${canonicalId}`);
      const canonicalEmbeddedBase = {
        name: canonical.name,
        type: canonical.type,
        img: canonical.img,
        effects: canonical.effects,
        system: canonical.system,
      };
      const materialized = merge(canonicalEmbeddedBase, embedded);
      materialized._id = embedded._id;
      if (embedded._key) materialized._key = embedded._key;
      else delete materialized._key;
      materialized.folder = embedded.folder ?? null;
      return materialized;
    }),
  };
}
