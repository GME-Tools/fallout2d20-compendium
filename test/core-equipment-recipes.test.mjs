import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { CORE_EQUIPMENT_RECIPES } from "../scripts/data/core-equipment-recipes.mjs";

async function load(language, pack) {
  const directory = path.join("src", "packs", language, `${pack}.db`);
  return Promise.all((await readdir(directory)).filter((file) => file.endsWith(".json")).map(async (file) => JSON.parse(await readFile(path.join(directory, file), "utf8"))));
}

test("equipment recipe inventory covers every Core table row", () => {
  assert.equal(CORE_EQUIPMENT_RECIPES.length, 117);
  assert.equal(CORE_EQUIPMENT_RECIPES.filter((row) => row.station === "armor").length, 49);
  assert.equal(CORE_EQUIPMENT_RECIPES.filter((row) => row.station === "power-armor").length, 50);
  assert.equal(CORE_EQUIPMENT_RECIPES.filter((row) => row.station === "robot").length, 18);
});

test("armor, Power Armor, and robot recipes are paired and embedded", async () => {
  for (const pack of ["apparel-mods", "robot-armor", "robot-modules"]) {
    const en = await load("en", pack);
    const fr = new Map((await load("fr", pack)).map((item) => [item._id, item]));
    const recipes = en.filter((item) => item.flags?.["fallout2d20-compendium"]?.recipe);
    assert.ok(recipes.length > 0, `${pack} has no recipes`);
    for (const item of recipes) {
      assert.ok(fr.get(item._id)?.flags?.["fallout2d20-compendium"]?.recipe, `${item.name} has no French recipe`);
      assert.match(item.system.description, /data-f2d20-recipe="core"/);
    }
  }
});

test("location-specific material surcharges are represented", async () => {
  const power = await load("en", "apparel-mods");
  const t45bArm = power.find((item) => item.name === "T-45b Arm").flags["fallout2d20-compendium"].recipe;
  const t45bChest = power.find((item) => item.name === "T-45b Chest Piece").flags["fallout2d20-compendium"].recipe;
  assert.equal(t45bChest.materials.uncommon, t45bArm.materials.uncommon + 1);
  const robot = await load("en", "robot-armor");
  const arm = robot.find((item) => item.name === "Factory Armor (Arm 1)").flags["fallout2d20-compendium"].recipe;
  const body = robot.find((item) => item.name === "Factory Armor (Main Body)").flags["fallout2d20-compendium"].recipe;
  assert.equal(body.materials.uncommon, arm.materials.uncommon + 1);
});
