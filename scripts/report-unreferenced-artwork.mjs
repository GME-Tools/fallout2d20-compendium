import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

async function files(root){const found=[];for(const entry of await readdir(root,{withFileTypes:true})){const target=path.join(root,entry.name);if(entry.isDirectory())found.push(...await files(target));else found.push(target);}return found;}
const sourceText=(await Promise.all((await files("src")).filter(file=>file.endsWith(".json")).map(file=>readFile(file,"utf8")))).join("\n");
const images=(await files("artwork")).filter(file=>/\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(file)).sort((a,b)=>a.localeCompare(b,"en"));
const unreferenced=images.filter(file=>{
  const relative=file.replaceAll(path.sep,"/"),modulePath=`modules/fallout2d20-compendium/${relative}`;
  return !sourceText.includes(relative)&&!sourceText.includes(encodeURI(relative))&&!sourceText.includes(modulePath)&&!sourceText.includes(encodeURI(modulePath));
});
const report=`# Images d’artwork non référencées par src\n\n> Généré par \`npm run report:artwork\`. Une image est considérée référencée lorsque son chemin local ou son chemin de module apparaît dans une fiche JSON sous \`src/\`.\n\nTotal : ${unreferenced.length} image(s) sur ${images.length}.\n\n${unreferenced.map(file=>`- \`${file.replaceAll(path.sep,"/")}\``).join("\n") || "Aucune."}\n`;
await writeFile("reports/unreferenced-artwork.md",report);
console.log(`Reported ${unreferenced.length} unreferenced artwork image(s) out of ${images.length}.`);
