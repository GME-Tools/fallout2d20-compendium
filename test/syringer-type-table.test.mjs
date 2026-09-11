import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const tableId="SyringeTypeTbl01",ammoIds=new Set(["SyrBerserkAmmo01","SyrBleedOutAmmo1","SyrBloatflyAmmo1","SyrEndangerolA01","SyrLockJointAm01","SyrMindCloudAm01","SyrPaxAmmo000001","SyrRadVenomAm001","SyrYellowBelly01"]);
const docs=async(language,pack)=>Promise.all((await readdir(`generated/source-packs/${language}/${pack}.db`)).filter(file=>file.endsWith(".json")).map(file=>readFile(path.join(`generated/source-packs/${language}/${pack}.db`,file),"utf8").then(JSON.parse)));

test("generic Syringer Ammo is replaced by a bilingual 1d9 type table",async()=>{
  for(const language of ["en","fr"]){
    const ammunition=await docs(language,"ammunition");
    assert.equal(ammunition.some(document=>document._id==="HTHVoUBhAzf3CTuI"),false);
    assert.deepEqual(new Set(ammunition.filter(document=>document.flags?.["fallout2d20-compendium"]?.syringerEffect).map(document=>document._id)),ammoIds);
    const tables=await docs(language,"roll-tables"),table=tables.find(document=>document._id===tableId);
    assert.ok(table); assert.equal(table.formula,"1d9"); assert.equal(table.results.length,9);
    for(const result of table.results){assert.match(result.description,/\.Item\.[A-Za-z0-9]{16}/);}
    const randomResults=tables.flatMap(document=>document.results??[]).filter(document=>document._key?.startsWith("!tables.results!sa66QXOwlO8515AT.")&&document.name.includes(language==="en"?"Syringer":"seringue"));
    assert.equal(randomResults.length,2); for(const result of randomResults)assert.equal(result.documentId,tableId);
  }
});
