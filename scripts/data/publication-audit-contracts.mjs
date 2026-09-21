import { LANGUAGES, PACKS } from "../config.mjs";
import { approvedDuplicateNameGroups } from "./approved-core-duplicate-names.mjs";

// These are reviewed inputs. Audits may read and compare them but must never
// snapshot or rewrite them. Core keeps its purpose-built inventory tests.
export const PUBLICATION_INVENTORY_CONTRACTS = Object.freeze({
  core_rulebook: Object.freeze({
    mode: "specialized",
    catalogs: Object.freeze([
      "catalog/v1-core-character-creation.json",
      "catalog/v1-core-starting-equipment.json",
      "catalog/v1-core-equipment.json",
      "catalog/v1-core-survival-and-crafting.json",
      "catalog/v1-core-denizens.json"
    ])
  })
});

export const PUBLICATION_DUPLICATE_APPROVALS = Object.freeze(
  LANGUAGES.flatMap(language => PACKS.flatMap(({ name: pack }) =>
    approvedDuplicateNameGroups(language, pack).map(ids => Object.freeze({
      publication: "core_rulebook", language, pack, classification: "editorial", ids: Object.freeze(ids)
    }))
  ))
);
