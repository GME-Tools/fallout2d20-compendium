import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const playwrightModule = process.env.PLAYWRIGHT_MODULE || "playwright";
const { chromium } = await import(playwrightModule.startsWith("/") ? pathToFileURL(playwrightModule) : playwrightModule);
const baseUrl = process.env.FOUNDRY_URL || "http://127.0.0.1:30001";
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
const browser = await chromium.launch({ headless: true, executablePath, args: ["--no-sandbox"] });

async function join(context, username) {
  const page = await context.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  if (page.url().endsWith("/join")) {
    const user = page.locator("#join-username");
    if (await user.evaluate(element => element.tagName === "SELECT")) await user.selectOption({ label: username });
    else await user.fill(username);
    await page.locator("#join-password").fill("");
    await page.locator("button[name=join]").click();
  }
  await page.waitForURL(/\/game$/, { timeout: 30_000 });
  await page.waitForFunction(() => globalThis.game?.ready === true, null, { timeout: 30_000 });
  return page;
}

async function setAndInspect(page, visibility) {
  return page.evaluate(async value => {
    const moduleId = "fallout2d20-compendium";
    await game.settings.set(moduleId, "languageVisibility", value);
    await ui.compendium.render({ force: true });
    await new Promise(resolve => setTimeout(resolve, 250));
    const root = ui.compendium.element?.[0] ?? ui.compendium.element ?? document;
    const entries = [...root.querySelectorAll("[data-entry-id], [data-pack]")]
      .map(element => element.dataset.entryId ?? element.dataset.pack)
      .filter(id => id?.startsWith(`${moduleId}.`));
    const hiddenUuid = value === "en"
      ? "Compendium.fallout2d20-compendium.fr-skills.Item.F4uIprrKWh9ApMaU"
      : "Compendium.fallout2d20-compendium.en-skills.Item.F4uIprrKWh9ApMaU";
    return {
      stored: game.settings.get(moduleId, "languageVisibility"),
      englishEntries: entries.filter(id => id.startsWith(`${moduleId}.en-`)).length,
      frenchEntries: entries.filter(id => id.startsWith(`${moduleId}.fr-`)).length,
      packCount: [...game.packs].filter(pack => pack.collection.startsWith(`${moduleId}.`)).length,
      hiddenUuidResolved: Boolean(await fromUuid(hiddenUuid))
    };
  }, visibility);
}

const gmContext = await browser.newContext();
let gmPage;
let playerContext;
let playerId;
try {
  gmPage = await join(gmContext, process.env.FOUNDRY_USERNAME || "Gamemaster");
  const capacity = await gmPage.evaluate(async () => {
    const actor = await Actor.create({ name: "US-106 capacity check", type: "character" }, { renderSheet: false });
    try {
      await actor.update({ "system.attributes.str.value": 5 });
      actor.prepareData();
      return { base: actor.system.carryWeight.base, value: actor.system.carryWeight.value, useKgs: actor.useKgs };
    } finally {
      await actor.delete();
    }
  });
  assert.deepEqual(capacity, { base: 100, value: 100, useKgs: true });

  const frenchActor = await gmPage.evaluate(async () => {
    const moduleId = "fallout2d20-compendium";
    const frenchActors = await game.packs.get(`${moduleId}.fr-denizens`).getDocuments();
    const englishPack = game.packs.get(`${moduleId}.en-denizens`);
    for (const actor of frenchActors) {
      const english = await englishPack.getDocument(actor.id);
      const frenchItem = [...actor.items].find(item => Number(item.system?.weight) > 0 && english.items.get(item.id));
      if (!frenchItem) continue;
      const englishItem = english.items.get(frenchItem.id);
      return {
        useKgs: actor.useKgs,
        strength: Number(actor.system.attributes.str.value),
        carryBase: Number(actor.system.carryWeight.base),
        frenchWeight: Number(frenchItem.system.weight),
        englishWeight: Number(englishItem.system.weight)
      };
    }
    return null;
  });
  assert.ok(frenchActor, "a paired French Actor weight sample is required");
  assert.equal(frenchActor.useKgs, true);
  assert.equal(frenchActor.carryBase, frenchActor.strength * 5 + 75);
  assert.equal(frenchActor.frenchWeight, frenchActor.englishWeight / 2);

  playerId = await gmPage.evaluate(async () => (await User.create({ name: "US-106 Player", role: 1, password: "" })).id);
  playerContext = await browser.newContext();
  const playerPage = await join(playerContext, "US-106 Player");

  const gmBoth = await setAndInspect(gmPage, "both");
  const playerBoth = await setAndInspect(playerPage, "both");
  const gmVisibility = await setAndInspect(gmPage, "en");
  const playerVisibility = await setAndInspect(playerPage, "fr");
  await Promise.all([gmPage.reload({ waitUntil: "networkidle" }), playerPage.reload({ waitUntil: "networkidle" })]);
  await Promise.all([
    gmPage.waitForFunction(() => globalThis.game?.ready === true),
    playerPage.waitForFunction(() => globalThis.game?.ready === true)
  ]);
  const persisted = await Promise.all([
    gmPage.evaluate(() => game.settings.get("fallout2d20-compendium", "languageVisibility")),
    playerPage.evaluate(() => game.settings.get("fallout2d20-compendium", "languageVisibility"))
  ]);

  assert.deepEqual(gmBoth, { stored: "both", englishEntries: 20, frenchEntries: 20, packCount: 40, hiddenUuidResolved: true });
  assert.deepEqual(playerBoth, { stored: "both", englishEntries: 20, frenchEntries: 20, packCount: 40, hiddenUuidResolved: true });
  assert.deepEqual(gmVisibility, { stored: "en", englishEntries: 20, frenchEntries: 0, packCount: 40, hiddenUuidResolved: true });
  assert.deepEqual(playerVisibility, { stored: "fr", englishEntries: 0, frenchEntries: 20, packCount: 40, hiddenUuidResolved: true });
  assert.deepEqual(persisted, ["en", "fr"]);
  console.log(JSON.stringify({ capacity, frenchActor, gmBoth, playerBoth, gmVisibility, playerVisibility, persisted }, null, 2));
} finally {
  if (playerContext) await playerContext.close();
  if (gmPage && playerId) await gmPage.evaluate(id => game.users.get(id)?.delete(), playerId).catch(() => {});
  await gmContext.close();
  await browser.close();
}
