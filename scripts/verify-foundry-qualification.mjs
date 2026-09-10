import assert from "node:assert/strict";

const required = ["GITHUB_SHA", "FOUNDRY_QUALIFIED_SHA", "FOUNDRY_EXPECTED_VERSION", "FOUNDRY_EXPECTED_SYSTEM_VERSION"];
for (const name of required) assert.ok(process.env[name], `Missing release qualification value ${name}`);
assert.equal(
  process.env.FOUNDRY_QUALIFIED_SHA,
  process.env.GITHUB_SHA,
  `Foundry qualification belongs to ${process.env.FOUNDRY_QUALIFIED_SHA}, not release commit ${process.env.GITHUB_SHA}`
);
assert.match(process.env.FOUNDRY_EXPECTED_VERSION, /^14\.\d+$/, "Release must declare an exact Foundry v14 version");
assert.match(process.env.FOUNDRY_EXPECTED_SYSTEM_VERSION, /^11\.\d+\.\d+$/, "Release must declare an exact supported Fallout 11 version");
console.log(`Verified Foundry ${process.env.FOUNDRY_EXPECTED_VERSION} / Fallout ${process.env.FOUNDRY_EXPECTED_SYSTEM_VERSION} qualification for ${process.env.GITHUB_SHA}.`);
