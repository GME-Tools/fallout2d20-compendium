import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const playwrightModule = process.env.PLAYWRIGHT_MODULE || "playwright";
const { chromium } = await import(playwrightModule.startsWith("/") ? pathToFileURL(playwrightModule) : playwrightModule);
const baseUrl = process.env.FOUNDRY_URL || "http://127.0.0.1:30001";
const username = process.env.FOUNDRY_USERNAME || "Gamemaster";
const password = process.env.FOUNDRY_PASSWORD || "";
const ammoTimeout = Number(process.env.FOUNDRY_AMMO_TIMEOUT || 30_000);
const expectedFoundryVersion = process.env.FOUNDRY_EXPECTED_VERSION;
const expectedSystemVersion = process.env.FOUNDRY_EXPECTED_SYSTEM_VERSION;
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;

const browser = await chromium.launch({ headless: true, executablePath, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const browserErrors = [];
const failedResources = [];
page.on("console", message => {
  if (message.type() === "error") browserErrors.push(message.text());
});
page.on("pageerror", error => browserErrors.push(error.message));
page.on("response", response => {
  if (response.status() >= 400) failedResources.push({ status: response.status(), url: response.url() });
});

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  if (page.url().endsWith("/join")) {
    await page.locator("#join-username").fill(username);
    await page.locator("#join-password").fill(password);
    await page.locator("button[name=join]").click();
  }
  await page.waitForURL(/\/game$/, { timeout: 30_000 });
  await page.waitForFunction(() => globalThis.game?.ready === true, null, { timeout: 30_000 });
  await page.waitForFunction(() => CONFIG.FALLOUT?.AMMO_BY_UUID && CONFIG.FALLOUT?.AMMO_TYPES, null, { timeout: ammoTimeout });

  const result = await page.evaluate(async () => {
    const moduleId = "fallout2d20-compendium";
    const packs = [...game.packs].filter(pack => pack.collection.startsWith(`${moduleId}.`));
    const documentsByPack = new Map();
    const packCounts = {};
    for (const pack of packs) {
      const documents = await pack.getDocuments();
      documentsByPack.set(pack.collection, documents);
      packCounts[pack.collection] = documents.length;
    }

    const uuids = new Set();
    for (const documents of documentsByPack.values()) {
      for (const document of documents) {
        for (const match of JSON.stringify(document.toObject()).matchAll(/@UUID\[([^\]]+)]/g)) uuids.add(match[1]);
      }
    }
    const unresolvedUuids = [];
    for (const uuid of uuids) {
      try {
        if (!await fromUuid(uuid)) unresolvedUuids.push(uuid);
      } catch {
        unresolvedUuids.push(uuid);
      }
    }

    const enWeapons = documentsByPack.get(`${moduleId}.en-weapons`);
    const enDenizens = documentsByPack.get(`${moduleId}.en-denizens`);
    const frDenizens = documentsByPack.get(`${moduleId}.fr-denizens`);
    const enTables = documentsByPack.get(`${moduleId}.en-roll-tables`);
    const enPerks = documentsByPack.get(`${moduleId}.en-perks`);
    const frPerks = documentsByPack.get(`${moduleId}.fr-perks`);

    const weapon = enWeapons[0];
    const npcSource = enDenizens.find(actor => actor.items.size > 0);
    const creatureSource = frDenizens.find(actor => actor.items.size > 0);
    const effectPerkEn = enPerks.find(item => item.id === "LSUSRTgMyqfN1EQx");
    const effectPerkFr = frPerks.find(item => item.id === "LSUSRTgMyqfN1EQx");
    const table = enTables[0];

    const created = [];
    let importChecks;
    try {
      const worldItem = await Item.create(weapon.toObject(), { renderSheet: false });
      const worldNpc = await Actor.create(npcSource.toObject(), { renderSheet: false });
      const worldCreature = await Actor.create(creatureSource.toObject(), { renderSheet: false });
      created.push(worldItem, worldNpc, worldCreature);

      const embeddedBefore = worldNpc.items.size;
      await worldNpc.createEmbeddedDocuments("Item", [weapon.toObject()]);
      importChecks = {
        itemCreated: worldItem instanceof Item,
        npcItemsPreserved: embeddedBefore === npcSource.items.size && embeddedBefore > 0,
        creatureItemsPreserved: worldCreature.items.size === creatureSource.items.size && worldCreature.items.size > 0,
        compatibleActorDrop: worldNpc.items.size === embeddedBefore + 1
      };

      weapon.sheet.render(true);
      npcSource.sheet.render(true);
      table.sheet.render(true);
      await new Promise(resolve => setTimeout(resolve, 750));
      const isRendered = sheet => Boolean(
        sheet.rendered
        || sheet.element?.isConnected
        || sheet.element?.[0]?.isConnected
        || document.getElementById(sheet.id)
        || foundry.applications?.instances?.has?.(sheet.id)
      );
      importChecks.itemSheetRendered = isRendered(weapon.sheet);
      importChecks.actorSheetRendered = isRendered(npcSource.sheet);
      importChecks.tableSheetRendered = isRendered(table.sheet);
      await weapon.sheet.close();
      await npcSource.sheet.close();
      await table.sheet.close();

      const draws = await Promise.all(enTables.map((candidate) => candidate.draw({ displayChat: false })));
      importChecks.tableDrawn = draws.length === 42 && draws.every((draw) => draw.results.length === 1);
    } finally {
      for (const document of created.reverse()) await document.delete();
    }

    return {
      foundryVersion: game.version,
      systemId: game.system.id,
      systemVersion: game.system.version,
      packCounts,
      packCount: packs.length,
      documentCount: Object.values(packCounts).reduce((sum, count) => sum + count, 0),
      uuidCount: uuids.size,
      unresolvedUuids,
      actorEmbeddedItems: {
        enNpc: npcSource.items.size,
        frCreature: creatureSource.items.size
      },
      perkEffects: {
        en: effectPerkEn.effects.size,
        fr: effectPerkFr.effects.size
      },
      importChecks
    };
  });

  assert.match(result.foundryVersion, /^14\./, "Foundry v14 is required");
  if (expectedFoundryVersion) assert.equal(result.foundryVersion, expectedFoundryVersion);
  assert.equal(result.systemId, "fallout");
  if (expectedSystemVersion) assert.equal(result.systemVersion, expectedSystemVersion);
  assert.equal(result.packCount, 36);
  assert.equal(result.documentCount, 2650);
  assert.deepEqual(result.unresolvedUuids, []);
  assert.ok(result.actorEmbeddedItems.enNpc > 0);
  assert.ok(result.actorEmbeddedItems.frCreature > 0);
  assert.deepEqual(result.perkEffects, { en: 1, fr: 1 });
  for (const [check, passed] of Object.entries(result.importChecks)) assert.equal(passed, true, check);
  assert.deepEqual({ browserErrors, failedResources }, { browserErrors: [], failedResources: [] });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  const diagnostics = await page.evaluate(() => ({
    url: location.href,
    gameReady: globalThis.game?.ready ?? null,
    moduleActive: globalThis.game?.modules?.get("fallout2d20-compendium")?.active ?? null,
    ammoByUuidType: typeof globalThis.CONFIG?.FALLOUT?.AMMO_BY_UUID,
    ammoTypesType: typeof globalThis.CONFIG?.FALLOUT?.AMMO_TYPES,
    compatibilityResources: performance.getEntriesByType("resource")
      .map(entry => entry.name)
      .filter(name => name.includes("fallout-v14-compat"))
  })).catch(() => ({ url: page.url() }));
  console.error(JSON.stringify({ diagnostics, browserErrors, failedResources }, null, 2));
  throw error;
} finally {
  await browser.close();
}
