import { readFile } from "node:fs/promises";

const version = JSON.parse(await readFile("module.json", "utf8")).version;
const expected = `v${version}`;
if (process.env.RELEASE_TAG !== expected) {
  console.error(`Release tag ${process.env.RELEASE_TAG} does not match manifest version ${expected}.`);
  process.exitCode = 1;
} else {
  console.log(`Release tag matches ${expected}.`);
}
