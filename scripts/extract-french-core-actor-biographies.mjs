import { readFile,writeFile } from "node:fs/promises";
import path from "node:path";
import { FRENCH_CORE_ACTOR_BIOGRAPHY_SOURCES as sources } from "./data/french-core-actor-biography-sources.mjs";

function clean(lines){
  const out=[];
  for(const raw of lines){const line=raw.trim();if(!line)continue;if(out.length&&out.at(-1).endsWith("-")&&/^[a-zà-öø-ÿ]/.test(line)){out[out.length-1]=out.at(-1).slice(0,-1)+line;}else out.push(line);}
  return out.join(" ").replace(/\s+([,.;:!?])/g,"$1").replace(/\s+/g," ").replace(/\bavantguerre\b/gi,"avant-guerre").replace(/\baprès-guerre\b/gi,"après-guerre").trim();
}
async function extract({page,column}){
  const file=path.join("tmp","pdfs","fr-actor-columns",`${page}-${column}.txt`),lines=(await readFile(file,"utf8")).replace(/\r/g,"").split("\n");
  const level=lines.findIndex(line=>/^Niveau \d+/.test(line.trim()));if(level<0)throw new Error(`${file}: missing level line`);
  let start=level+1;
  while(start<lines.length&&!(lines[start].trim().length>20&&/[a-zà-öø-ÿ]/.test(lines[start])&&!/^(?:Créature|Personnage|Niveau)/.test(lines[start].trim())))start++;
  const body=[];
  for(let i=start;i<lines.length;i++){const line=lines[i].trim();if(/^(?:CORPS|COMPÉTENCES|ATTAQUES|CAPACITÉS SPÉCIALES|INVENTAIRE|(?:\d{3}\s+)?FALLOUT.*|Chapitre .*|\d{3}|[SPECIALAV]|)$/.test(line))break;body.push(lines[i]);}
  const biography=clean(body);if(biography.length<45)throw new Error(`${file}: extracted biography is too short (${biography})`);return biography;
}

const biographies={};
for(const[name,source]of Object.entries(sources))if(!source.alias)biographies[name]=await extract(source);
for(const[name,source]of Object.entries(sources))if(source.alias)biographies[name]=biographies[source.alias];
await writeFile("catalog/v1-core-fr-actor-biographies.json",`${JSON.stringify(biographies,null,2)}\n`);
console.log(`Extracted ${Object.keys(biographies).length} French Core actor biographies.`);
