# US-301 — Inventaire soumis à validation

Statut : approuvé par le propriétaire le 2026-09-09. US-303 autorisée, avec la
consigne de garder les descriptions concises.

## Sources et méthode

- Source : `MUH052193 Fallout - GM's Toolkit Booklet [2021-04-22].pdf`,
  68 pages, SHA-256
  `6c230e8c85a9dc2da6d96a85d2c93ce7f8689faf23f5d65d6dce1eea076c14f8`.
- Référence : Core anglais numérique de février 2023, corrigé par Errata Log V6
  (2026), puis sources canoniques actuelles.
- Les numéros PDF et imprimés coïncident de 1 à 68.
- Chaque page a été extraite et revue. Les pages 18 à 24 ont aussi été rendues
  visuellement pour contrôler les plages et la structure des tableaux.
- Aucun PDF, OCR, rendu ou contenu de jeu n'est ajouté à Git.

Les classifications employées sont : `nouvel élément`, `réimpression
identique`, `errata déjà appliqué`, `correction`, `contradiction`, `variante
mécanique`, `différence de traduction` et `ambiguïté`. Le livret n'a pas de
source française : tout texte FR publié serait une traduction du projet.

## Périmètre proposé pour US-303

| Page | Élément | Formule/plages | Classement | Décision proposée |
| --- | --- | --- | --- | --- |
| 17-19 | Procédure complète « Creating Scavenging Locations » | Quatre étapes ; niveau = total de dés de combat égal à la somme des niveaux des PJ, plus la difficulté du degré de fouille ; chaque effet ajoute 1 si la zone comporte un problème | nouvel élément | Publier la procédure dans la description des tables concernées ; ne pas transformer les choix discrétionnaires en tirages inventés. |
| 18 | `Location Scale` | Tiny 6, Small 12, Average 18, Large 24 | nouvel élément, contrôle déterministe | Conserver comme table de référence non tirable dans la description de la procédure. |
| 18 | `Location Category` | 6 catégories et 6 unités par zone Tiny, multiplicateurs x2/x3/x4 | nouvel élément, contrôle déterministe | Conserver intégralement dans la description ; aucune distribution aléatoire n'est donnée par la source. |
| 18 | `Other Found Items` | 1d20 : 1-3 ammunition, 4-5 armor, 6-8 clothing, 9-11 food, 12-14 beverages, 15-16 chems, 17-18 weapons, 19-20 oddities | nouvel élément | Importer comme RollTable ; huit résultats, couverture 1-20 exhaustive. |
| 18 | `Degree of Search` | Untouched 0/2, Partly 1/3, Mostly 2/4, Heavily 3/5 ; réductions multipliées par l'échelle | nouvel élément, contrôle déterministe | Conserver intégralement dans la description ; le degré est sélectionné, pas lancé. |
| 19-20 | Fin de la procédure, problèmes et zones imbriquées | obstacle : difficulté 1, +1 au niveau 6 puis tous les 5 niveaux, max 5 ; hazard et habitants selon les formules imprimées ; zone imbriquée +2/+3 niveaux possible | nouvel élément | Conserver le texte mécanique nécessaire dans la description, sans créer de résultat de table fictif. |
| 20 | `Random Encounter Type` | 1d20 : Ordinary 1-7, Object 8-12, Campsite 13-16, Choke Point 17-19, Animosity 20 | nouvel élément | Importer ; cinq résultats, probabilités 35/25/20/15/5 %. |
| 21 | `Random Ordinary Encounters` | 1d20 ; 1-3 puis 4 à 20 | nouvel élément | Importer les 18 résultats/plages, texte intégral. `Travelling Merchant` apparaît volontairement aux résultats 12 et 19. |
| 22 | `Random Object Encounters` | 1d20 : 1-3, 4-5, 6-9, 10-11, 12-14, 15, 16, 17-18, 19-20 | nouvel élément | Importer les neuf résultats/plages, texte intégral et formules imbriquées. Les références aux tables de butin devront viser les UUID locaux de langue. |
| 23 | `Random Campsite Encounters` | 1d20 : 1-3, 4-7, 8-10, 11-14, 15-17, 18-20 | nouvel élément | Importer les six résultats/plages, texte intégral. |
| 23 | `Random Choke Point Encounters` | 1d20 : 1-4, 5-8, 9-12, 13-16, 17-20 | nouvel élément | Importer les cinq résultats/plages, texte intégral. |
| 24 | `Random Factions for Animosity Encounters` | deux tirages 1d20 avec relance des doublons ; plages 1-3, 4-6, 7-9, 10, 11-12, 13-14, 15-17, 18-19, 20 | nouvel élément | Importer les neuf résultats/plages. La récursion « deux tirages sans doublon » doit être documentée et testée dans Foundry. |

Noms FR proposés, tous marqués `translation: project` dans la provenance et
jamais dans le nom affiché :

| EN | FR proposé |
| --- | --- |
| Other Found Items | Autres objets trouvés |
| Random Encounter Type | Type de rencontre aléatoire |
| Random Ordinary Encounters | Rencontres ordinaires aléatoires |
| Random Object Encounters | Rencontres d'objets aléatoires |
| Random Campsite Encounters | Rencontres de campement aléatoires |
| Random Choke Point Encounters | Rencontres de passage obligé aléatoires |
| Random Factions for Animosity Encounters | Factions aléatoires pour les rencontres d'animosité |

## Inventaire page par page

| Pages | Contenu structuré constaté | Classement et traitement proposé |
| --- | --- | --- |
| 1 | couverture | hors contenu structuré |
| 2 | crédits | hors contenu structuré |
| 3 | sommaire | contrôle d'exhaustivité ; hors import |
| 4 | règles de tests étendus | nouvelle règle non tabulaire ; contrôle, hors périmètre validé |
| 5 | tests étendus : résolution, résistance, dépenses de PA, bénéfices | nouvelle règle non tabulaire ; contrôle, hors import |
| 6 | tests chronométrés, initiative variable, exemple ; début de réputation | nouvelles variantes de règles ; contrôles, hors import |
| 7 | `Character Faction Reputation`, rangs 0-5 | nouvel élément statique ; contrôle, hors import selon la décision de périmètre GM Toolkit |
| 8 | influences positives/négatives et assistance des factions | nouvelle règle statique ; contrôle, hors import |
| 9 | voyage, terrain, vitesse, fatigue | nouvelle règle statique ; contrôle, hors import |
| 10 | forêt, feu de forêt, collines | nouvelles variantes de terrain ; contrôles, hors import |
| 11 | marais, sables mouvants, montagnes | nouvelles variantes de terrain ; contrôles, hors import |
| 12 | désert, chaleur, mal des montagnes | nouvelles variantes de terrain ; contrôles, hors import |
| 13 | plaines, poussière, lacs/rivières/côtes | nouvelles variantes de terrain ; contrôles, hors import |
| 14 | ruines, navigation verticale | nouvelle règle statique ; contrôle, hors import |
| 15 | navigation, choix d'un itinéraire | nouvelle règle statique ; contrôle, hors import |
| 16 | table `Navigation Conditions` | nouvel élément statique ; contrôle, hors import |
| 17 | table `Navigation Action Point Spends` ; début du générateur de lieux | table de voyage hors périmètre ; début du périmètre proposé |
| 18 | échelle, catégorie, autre objet, degré de fouille | périmètre proposé, détail ci-dessus |
| 19 | risque/récompense, obstacles, dangers, habitants | périmètre proposé, détail ci-dessus |
| 20 | fin du générateur ; déclenchement et type de rencontre | périmètre proposé, détail ci-dessus |
| 21 | rencontres ordinaires | périmètre proposé |
| 22 | rencontres d'objets | périmètre proposé |
| 23 | rencontres de campement et de passage obligé | périmètre proposé |
| 24 | factions pour rencontres d'animosité | périmètre proposé |
| 25 | ammunition availability/rarity | réimpression Core de contrôle ; contradiction connue : `Syringer Ammo` générique, supprimée du canon au profit des neuf types et de la table 1d9 ; ne pas importer |
| 26 | small guns | réimpressions Core de contrôle ; ne pas importer |
| 27 | small gun receiver/barrel/magazine mods | réimpressions ; errata du 8 avril 2021 déjà appliqué (`Shielded Barrel` et magazine mods présents) ; ne pas importer |
| 28 | small gun grip/stock/sight/muzzle mods ; energy weapons | réimpressions Core de contrôle ; ne pas importer |
| 29 | energy weapon capacitor/barrel/grip/stock mods | réimpressions Core de contrôle ; ne pas importer |
| 30 | energy weapon sight/muzzle et laser musket/gamma mods | réimpressions Core de contrôle ; ne pas importer |
| 31 | big guns et début des mods | réimpressions ; corrections 2022 des prérequis de mods de Flamer absentes ; ne pas importer |
| 32 | mods uniques gatling laser, flamer, heavy incinerator et junk jet | réimpressions Core de contrôle ; ne pas importer |
| 33 | mods uniques minigun et missile launcher | réimpressions Core de contrôle ; ne pas importer |
| 34 | melee weapons et début des melee mods | réimpressions Core de contrôle ; ne pas importer |
| 35 | sword, sledgehammer et machete mods | réimpressions Core de contrôle ; ne pas importer |
| 36 | switchblade, baseball bat, pipe wrench et rolling pin mods | réimpressions Core de contrôle ; ne pas importer |
| 37 | baton, board, lead pipe, tire iron et walking cane mods | réimpressions Core de contrôle ; ne pas importer |
| 38 | deathclaw gauntlet mod et explosives | réimpressions Core de contrôle ; ne pas importer |
| 39 | throwing weapons, clothing et début de headgear | réimpressions Core de contrôle ; ne pas importer |
| 40 | headgear et apparel DR | réimpressions Core de contrôle ; ne pas importer |
| 41 | armor et Vault jumpsuit mods | réimpressions Core de contrôle ; ne pas importer |
| 42 | leather, raider et metal armor | réimpressions Core de contrôle ; ne pas importer |
| 43 | synth/combat armor et début des material mods | réimpressions Core de contrôle ; ne pas importer |
| 44 | armor material mods | réimpressions Core de contrôle ; ne pas importer |
| 45 | armor upgrades | contradiction avec Errata V6 : anciennes entrées `Laminated`, `Resin`, `Microcarbon` au lieu de `Lighter Build`, `Pocketed`, `Deep Pocketed` ; ne pas importer |
| 46 | power armor | réimpression antérieure à la correction 2022 des colonnes poids/coût ; ne pas importer |
| 47 | règles et table générale de power armor mods | réimpressions Core de contrôle ; ne pas importer |
| 48 | T-45 et début T-51 upgrade mods | réimpressions Core de contrôle ; ne pas importer |
| 49 | suite T-51 et T-60 upgrade mods | réimpressions Core de contrôle ; ne pas importer |
| 50 | X-01 upgrade et plating mods | réimpressions Core de contrôle ; ne pas importer |
| 51 | power armor system mods | réimpressions Core de contrôle ; ne pas importer |
| 52 | fin des system mods et plating mods | réimpressions Core de contrôle ; ne pas importer |
| 53 | robot armor et début des frames/plates | réimpressions Core de contrôle ; ne pas importer |
| 54 | suite robot armor frames/plates | réimpressions Core de contrôle ; ne pas importer |
| 55 | robot modules | réimpressions Core de contrôle ; ne pas importer |
| 56 | règles de butin et table d'ammunition | réimpression Core ; soumise aux corrections Core actuelles, dont la résolution Syringer 1d9 ; ne pas importer |
| 57 | random armor et clothing | réimpressions Core de contrôle ; ne pas importer |
| 58 | random food | réimpression Core de contrôle ; ne pas importer |
| 59 | random beverages | réimpression Core de contrôle ; ne pas importer |
| 60 | random chems et début de random ranged weapons | réimpressions ; la table ranged précède la correction 2022 signalée par l'errata ; ne pas importer |
| 61 | fin de random ranged weapons et random melee weapons | réimpressions Core de contrôle ; ne pas importer |
| 62 | random thrown/explosive weapons | réimpression Core de contrôle ; ne pas importer |
| 63 | random oddities and valuables | réimpression Core de contrôle ; ne pas importer |
| 64 | objets inhabituels, junk et début du salvage | règles statiques Core ; contrôles, hors import |
| 65 | catégories de matériaux et fin du salvage | règles statiques Core ; contrôles, hors import |
| 66 | page blanche | aucun contenu |
| 67 | page blanche | aucun contenu |
| 68 | fiche de suivi de personnage / publicité | aide non structurée, hors import |

## Contrôles approuvés par le propriétaire

1. Périmètre exact de **sept RollTables** : `Other Found Items`,
   `Random Encounter Type` et les cinq tables détaillées. Les tables de choix
   `Location Scale`, `Location Category` et `Degree of Search`, ainsi que les
   règles pages 17-20, seraient conservées dans leurs descriptions et non
   transformées artificiellement en tirages.
2. Les sept noms français proposés sont approuvés.
3. Les doublons intentionnels et les tirages imbriqués décrits
   ci-dessus doivent rester fidèles à l'édition du 22 avril 2021.

Toutes les autres pages restent des contrôles et n'ajoutent ni document, ni
apparence secondaire à un document Core dans US-303. Les descriptions de
tables ne recopient que les règles indispensables au tirage ou à la lecture des
résultats.
