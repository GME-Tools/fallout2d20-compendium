import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";

const moduleId="fallout2d20-compendium";
const decisions={
  "weapon-mods":{count:155,image:"artwork/Mod.webp",group:"shared-owner-mod-icon"},
  "apparel-mods":{count:196,image:"artwork/Mod.webp",group:"shared-owner-mod-icon"},
  "robot-modules":{count:13,image:"artwork/Mod.webp",group:"shared-owner-mod-icon"},
  diseases:{count:20,image:"artwork/Diseases.webp",group:"shared-owner-disease-icon"}
};

async function roots(language,pack){
  const directory=path.join("src","packs",language,`${pack}.db`);
  return (await Promise.all((await readdir(directory)).filter(file=>file.endsWith(".json")).map(file=>readFile(path.join(directory,file),"utf8").then(JSON.parse)))).filter(document=>!document._key?.split("!")[1]?.includes("."));
}

test("owner-supplied mod and disease artwork is shared by every bilingual target",async()=>{
  for(const [pack,decision] of Object.entries(decisions)){
    const en=await roots("en",pack),fr=new Map((await roots("fr",pack)).map(document=>[document._id,document]));
    assert.equal(en.length,decision.count,pack);
    for(const document of en){
      const translated=fr.get(document._id),source=document.flags[moduleId].source,translatedSource=translated?.flags[moduleId].source;
      assert.ok(translated,`${pack}/${document._id}`);
      assert.equal(document.img,`modules/${moduleId}/${decision.image}`);
      assert.equal(translated.img,document.img);
      for(const metadata of [source,translatedSource]){
        assert.equal(metadata.artworkStatus,"shared");
        assert.equal(metadata.artworkReviewed,true);
        assert.equal(metadata.artworkSharingGroup,decision.group);
        assert.ok(metadata.artworkSharingJustification);
        assert.match(metadata.artworkSource,/Owner-supplied repository asset/);
      }
    }
  }
  for(const image of new Set(Object.values(decisions).map(decision=>decision.image))){
    const [{width,height,format},details]=await Promise.all([sharp(image).metadata(),stat(image)]);
    assert.equal(format,"webp"); assert.equal(width,height); assert.ok(details.size<=300*1024);
  }
});
