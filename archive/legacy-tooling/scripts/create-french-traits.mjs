import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { MODULE_ID, documentKey } from "./config.mjs";
import { getPublication } from "./data/publications.mjs";

const sourceId = getPublication("core_rulebook").id;
import { slugify } from "./lib/files.mjs";

const translations = {
  "The Chain that Binds": ["La Chaîne de Cohésion", "<p>Vous obtenez un atout personnel supplémentaire qui doit être, au choix : Armes à énergie, Science ou Réparation. Cet atout personnel débute au rang 2.</p><p>En tant que membre de la Confrérie de l’Acier, vous êtes tenu de respecter la chaîne de commandement : la Chaîne de Cohésion. Vous devez suivre les ordres de vos supérieurs directs et vous êtes responsable de vos subordonnés. Si vous n’accomplissez pas votre devoir, vous êtes renvoyé de la Confrérie et votre matériel technologique est récupé… par tous les moyens nécessaires.</p>", 51],
  "Necrotic Post-Human": ["Post-humain nécrotique", "<p>Vous êtes immunisé aux dégâts de radiation. Au contraire, ils vous soignent : vous récupérez 1 PV par tranche de 3 points de dégâts de radiation qui vous sont infligés. Si vous vous reposez dans un environnement irradié, vous pouvez relancer votre réserve de dés pour voir si vos blessures guérissent. De plus, Survie devient un atout personnel : vous gagnez donc 2 rangs dans cette compétence.</p><p>Vous vieillissez bien plus lentement qu’un humain non irradié et vous êtes probablement bien plus vieux que vos compagnons non mutants. Peut-être avez-vous même survécu à la Grande Guerre de 2077. Néanmoins, vous êtes stérile : comme dit le proverbe, « la première génération de goules est la dernière ». Vous pouvez connaître une discrimination de la part des « peaux-lisses », ce qui augmente la difficulté ou la marge de complication des tests de Charisme selon les croyances de votre interlocuteur.</p>", 52],
  "Forced Evolution": ["Évolution forcée", "<p>Votre Force et votre Endurance augmentent de 2 et la valeur maximale de ces attributs est portée à 12. En revanche, votre Intelligence et votre Charisme ne peuvent jamais être supérieurs à 6. Chacune de vos compétences est limitée au rang 4. Vous êtes complètement immunisé aux dégâts de radiation et de poison.</p><p>Vous mesurez plus de 2,10 m et votre corps est épais et musculeux. Votre peau est verte, jaune ou grisâtre, quelle qu’ait été sa couleur d’origine. Vous ne semblez pas vieillir, mais vous êtes stérile. Les seules armures que vous pouvez porter doivent être spécialement conçues pour les super mutants.</p>", 53],
  "Mister Handy Robot": ["Robot Mister Handy", "<p>Vous êtes doté d’une vision à 360° et de systèmes sensoriels améliorés qui vous permettent de détecter des odeurs, des produits chimiques et des radiations, ce qui réduit de 1 la difficulté de tous les tests de Perception basés sur la vue et l’odorat. Vous êtes immunisé aux dégâts de radiation et de poison, mais ne pouvez pas utiliser de drogues. Vous ne retirez aucun bénéfice de la nourriture, des boissons ou du repos.</p><p>Vous vous déplacez par propulsion, en flottant au-dessus du sol, et n’êtes donc pas affecté par le terrain difficile ou les obstacles. Votre charge maximale est de 75 kg ; elle ne peut pas être accrue par votre Force ou vos aptitudes, mais peut l’être grâce à une armure modifiée. Vos blessures ne guérissent pas et vous ne récupérez aucun point de vie si personne ne vous répare.</p><p>Vous disposez de trois accessoires de bras déterminés par votre pack d’équipement. Si vous optez pour un bras doté d’une arme, vous recevez également 20 munitions pour cette arme.</p>", 55],
  "Educated": ["Éducation", "<p>Vous possédez un atout personnel supplémentaire.</p><p>Lorsque vous échouez à un test de compétence autre qu’un atout personnel, le MJ gagne 1 PA.</p>", 56],
  "Fast Shot": ["Tir rapide", "<p>Si vous entreprenez une seconde action capitale au combat afin d’effectuer une attaque à distance, il ne vous en coûte que 1 PA et non 2.</p><p>Vous ne tirez aucun bénéfice de l’action mineure Viser : vous êtes trop impatient.</p>", 56],
  "Gifted": ["Doué", "<p>Choisissez deux attributs S.P.E.C.I.A.L. : augmentez leur valeur de +1.</p><p>Votre nombre de points de Chance maximum est inférieur de 1 à la valeur de votre attribut de Chance.</p>", 56],
  "Heavy Handed": ["Main lourde", "<p>Votre bonus de dégâts au corps à corps augmente de +1 @fos[DC].</p><p>Vos attaques à mains nues et au corps à corps déclenchent une complication sur un 19 ou un 20, et non seulement sur un 20.</p>", 56],
  "Small Frame": ["Gringalet", "<p>Vous pouvez relancer 1d20 lors de tout test d’AGI basé sur l’équilibre ou les contorsions.</p><p>Votre charge maximale est de 75 + (2,5 × FOR) kg et non de 75 + (5 × FOR) kg.</p>", 56],
  "Vault Kid": ["Né à l’Abri", "<p>Votre jeunesse saine aux mains de médecins compétents et d’auto-docs sophistiqués implique que vous réduisez de 1, jusqu’à un minimum de 0, la difficulté de tous les tests d’END destinés à résister aux effets des maladies. De plus, le soin apporté à votre éducation vous permet de bénéficier d’un atout personnel supplémentaire au choix, qui commence donc au rang 2.</p><p>Vous pouvez décider avec le MJ du type d’expériences qui a eu lieu dans votre Abri. Une fois par quête, le MJ peut introduire une complication qui reflète la nature de cette expérimentation ou votre jeunesse passée en isolement et confinement. Dans ce cas, vous regagnez immédiatement un point de Chance.</p>", 57]
};

const englishRoot = "src/packs/en/traits.db";
const frenchRoot = "src/packs/fr/traits.db";
await rm(frenchRoot, { recursive: true, force: true });
await mkdir(frenchRoot, { recursive: true });
for (const filename of (await readdir(englishRoot)).filter(file => file.endsWith(".json")).sort()) {
  const document = JSON.parse(await readFile(path.join(englishRoot, filename), "utf8"));
  const translation = translations[document.name];
  if (!translation) throw new Error(`Missing French trait translation for ${document.name}`);
  const englishName = document.name;
  [document.name, document.system.description] = translation;
  document._key = documentKey("Item", document._id);
  const englishSource = document.flags[MODULE_ID].source;
  document.flags[MODULE_ID].source = {
    book: sourceId,
    language: "fr",
    page: translation[2],
    translatedFrom: document._id,
    translationReviewed: false,
    errataReviewed: englishSource.errataReviewed ?? false,
    ...(englishSource.errata ? { errata: englishSource.errata } : {})
  };
  await writeFile(path.join(frenchRoot, `${slugify(document.name)}__${document._id}.json`), `${JSON.stringify(document, null, 2)}\n`);
  console.log(`${englishName} -> ${document.name}`);
}
