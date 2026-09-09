# US-302 — Inventaire soumis à validation

Statut : approuvé par le propriétaire le 2026-09-09. US-304 autorisée.

## Sources, alignement et méthode

- EN : `Fallout - Starter Set - Adventure Booklet [OEF][2022-02-28].pdf`,
  60 pages, SHA-256
  `cdc5f5e0b8dfbe5d11549ab510ae2f49d65da4f3c006848e3bb7273006866a04`.
- FR officiel : `Fallout Initiation - Il Etait Une Fois Au Commonwealth.pdf`,
  31 pages scannées, SHA-256
  `4fcfbca1b96cadc1bfcff8b4fa0b605ceb954835fc84e886deb1b3cbf6ff6cc2`.
- La page scan FR 1 est la couverture. Pour les scans 2 à 31, chaque image est
  une double page : le scan `n` correspond aux pages imprimées EN/FR
  `2n-2` et `2n-1`, sauf le scan 31 qui contient la page 60 et la quatrième de
  couverture.
- Le FR n'a pas de couche texte. Un OCR `fra+eng` a servi d'index, puis les
  profils et tableaux ont été contrôlés sur les images 200 dpi. Les symboles
  de dés et les colonnes ne sont jamais arbitrés à partir de l'OCR seul.
- Comparaison avec le Core EN février 2023 + Errata V6 et les sources
  canoniques. Les poids FR suivent `kg = lb / 2` quand le couple est cohérent.

## Acteurs, attaques, aptitudes et inventaires

Les aptitudes et attaques restent des Items embarqués autonomes. Les objets
Core présents dans un inventaire utilisent des références canoniques neutres ;
une surcharge n'est proposée que pour une instance réellement différente.

| EN page / FR scan | Profil et correspondance FR | Classement | Décision/identité proposée |
| --- | --- | --- | --- |
| 11 / 6 droite | `Rad Rocky` / `Rad Rocky` | nouvel Actor ; différences FR correctrices | Créer `Rad Rocky`. Canoniser TN/dégâts cohérents du FR : unarmed TN9/3 CD, tire iron TN9/4 CD, sharpshooter pipe revolver TN9/4 CD. L'EN imprime respectivement 9/3, 9/3 et 8/3, incompatibles avec attributs et équipement. Description EN corrigée avec provenance explicite. |
| 11 / 6 droite | `Raider` / `Pillard` | variante mécanique du Raider Core | Proposer `Raider (Starter Set)` / `Pillard (Kit d'initiation)`. Le Starter a DR seulement bras/torse et une composition propre. Retenir le démonte-pneu Core/EN à 4 CD ; le FR imprime 3 CD. |
| 12 et 55 / 7 gauche et 28 droite | `Doctor Rast` / `Docteur Rast` | nouvel Actor avec deux occurrences contradictoires dans le même livre | **Décision requise.** La p.12 EN donne Energy Weapons 3, Lockpick 2, Medicine 4, Science 2, Small Guns 2, Sneak 1, Speech 3 ; la p.55 EN donne Energy Weapons 3, Medicine 4, Melee Weapons 3, Repair 1, Small Guns 1, Speech 1. Le FR p.55 répète en réalité le bloc p.12. Proposer une seule identité `Doctor Rast` / `Docteur Rast`, basée sur le profil p.12/FR, sauf décision de créer deux états `Guide` et `Revealed`. L'inventaire dit par erreur « Laser Pistol » en EN p.12/55 mais l'attaque, le récit et le FR disent `Institute Laser Rifle`; retenir le fusil. |
| 21 / 11 droite | `Mister Gutsy` / `Mister Gutsy` | variante mécanique du Core | Proposer `Mister Gutsy (Vault 95)` / `Mister Gutsy (Abri 95)`. Attributs, initiative, chance, compétences, pincer, flamer et salvage diffèrent du Core. Le FR ajoute à tort `Inaccurate` au 10mm auto pistol et `Burst, Blast` au flamer ; retenir les qualités EN. |
| 27 / 14 droite | `Dog` / `Chien` | réimpression Core identique | Réutiliser l'identité Core `IIt79NGkrmGwTdqa` et ajouter l'apparence Starter EN/FR. |
| 30 / 16 gauche | `Feral Ghoul` / `Goule sauvage` | correction de l'EN, identique au Core après correction | Réutiliser `POv2Na935TOgGqlX`. L'EN indique 10 XP ; le FR et le Core indiquent 24 XP. Retenir 24 et enregistrer la correction, sans nouvelle identité. |
| 33 / 17 droite | `Mirelurk Hatchling` / `Jeune fangeux` | réimpression Core identique | Réutiliser `uayuUMZDN0r3ylY3` et ajouter l'apparence. |
| 36 / 19 gauche | `Mirelurk Queen, Wounded` / `Reine des fangeux blessée` | variante mécanique de la reine Core ; EN/FR contradictoires | Proposer cette identité qualifiée. Retenir provisoirement les mécaniques EN : niveau 9, 67 XP, HP 28/50, Body 12, Mind 6, Melee 3, Other 3, pincer 7 CD, acid spray 5 CD. Le FR imprime 134 XP et 28/60 HP : **décision requise**. |
| 38 / 20 gauche | `Super Mutant` / `Super mutant` | réimpression Core presque identique | Réutiliser `9uRMSgaooTRV8AiH` avec canon corrigé : immunités natives radiation/poison et `Wealth 1` du Core. La table EN du Starter affiche 0 malgré les aptitudes d'immunité et omet Wealth 1 ; le FR corrige les immunités mais omet aussi Wealth 1. **Approbation requise** pour traiter ces écarts comme corrections et non variante. |
| 43 / 22 droite | `Diamond City Security` / `Agent de sécurité de Diamond City` | nouvel Actor | Créer sous ces noms. Attaques : unarmed 2, baseball bat 4, auto pipe rifle 2 ; équipement Core référencé et armure DC embarquée/référencée selon identité Core disponible. EN/FR mécaniquement alignés. |
| 46 / 24 gauche | `Commonwealth Merchant` / `Marchand du Commonwealth` | nouvel Actor générique | Créer sous ces noms. Le FR imprime 100 kg contre 210 lb (105 kg attendu) et 3 points de chance alors que l'EN n'en affiche aucun : **retenir 105 kg et aucune chance**, sauf décision contraire. Le FR ajoute `Reliable` au 10mm auto pistol, tandis que les deux langues impriment `Inaccurate` ; retenir les qualités EN. |
| 51 / 26 droite | `Miss Nanny Clara` / `Miss Nanny Clara` | nouvel Actor | Créer sous ce nom. EN/FR alignés sur le profil ; conserver pincer, buzzsaw, flamer et salvage embarqués. |
| 54 / 28 gauche | `Synth Replica` / `Copie synthétique` | nouvel Actor | Créer sous ces noms. EN/FR alignés ; auto pipe gun/rifle est une différence terminologique, la composition est une arme de fortune automatique à deux mains. |

### Occurrences d'Items intégrés

- Références Core à réutiliser lorsque mécaniquement identiques : Road
  Leathers/Vêtements de cuir, Tire Iron/Démonte-pneu, Pipe Gun/Arme de fortune,
  Sharpshooter's Grip, Stimpak, 10mm ammunition, Dog meat, ghoul junk,
  mirelurk meat, Board/Planche, Pipe Bolt-Action Rifle, Casual Clothing,
  baseball bat, pipe-gun mods, Drifter Outfit, 10mm Auto Pistol, Synth
  Component, Shock Baton et les objets de butin.
- Instances ou compositions propres à conserver embarquées : arme modifiée de
  Rad Rocky, fusil laser dissimulé de Rast, armures de sécurité DC si aucune
  identité Core exacte n'existe, buzzsaw/flamer de Clara, auto pipe weapon de
  la copie synthétique.
- `Rad Rocky` : attaques Unarmed Strike, Tire Iron, Sharpshooter's Pipe
  Revolver ; aptitudes Let Rip, Turn and Run ; inventaire Road Leathers,
  revolver modifié, Tire Iron, Wealth 1.
- `Raider` : attaques Unarmed Strike, Tire Iron, Pipe Gun ; aptitude Let Rip ;
  inventaire Road Leathers, Pipe Gun, Tire Iron, Wealth 1.
- `Doctor Rast` : Unarmed Strike et Boosted Focused Institute Laser Rifle ;
  Robot, Advanced Synth/Third-Generation Synth, Let Rip, Stimpak Supply,
  Hidden Armament ; fusil modifié, Ballistic Weave Lab Coat, Synth Component,
  Stimpaks et Wealth 4.
- `Mister Gutsy (Vault 95)` : Pincer, 10mm Auto Pistol, Flamer ; Robot, Immune
  to Poison/Radiation/Disease, Mister Handy, Mister Gutsy ; salvage imprimé.
- `Dog` : Bite ; Keen Senses ; butchery d'une portion de mongrel dog meat.
- `Feral Ghoul` : Unarmed ; Immune to Radiation, Immune to Poison, Feral,
  Ghoul, Play Dead ; 2 CD junk items.
- `Mirelurk Hatchling` : Pincers ; Immune to Radiation, Little, Aquatic ;
  butchery d'une portion de mirelurk meat.
- `Mirelurk Queen, Wounded` : Pincers, Acid Spray ; Hatchling Spawn, Immune to
  Radiation, Immune to Fear, Small Weak Point, Aquatic, Big ; Scavenging et
  Butchery (5 portions de queen mirelurk meat).
- `Super Mutant` : Unarmed Strike, Board, Pipe Bolt-Action Rifle ; Barbarian,
  Immune to Radiation, Immune to Poison ; armes, os humains et Wealth 1 selon
  la correction Core proposée.
- `Diamond City Security` : Unarmed Strike, Baseball Bat, Auto Pipe Rifle ; Let
  Rip ; vêtements, pièces d'armure DC, armes, 2 Stimpaks et Wealth 2.
- `Commonwealth Merchant` : Unarmed Strike, 10mm Auto Pistol ; Let Rip, Master
  Trader, Shopkeep ; Drifter Outfit, pistolet et Wealth 6.
- `Miss Nanny Clara` : Pincer, Buzzsaw, Flamer ; Robot, Immune to
  Poison/Radiation/Disease, Miss Nanny ; salvage imprimé.
- `Synth Replica` : Auto Pipe Gun et Shock Baton ; Robot, Immune to Fear,
  Immune to Disease, Third-Generation Synth ; armes, 3d20 Fusion Cells et
  Synth Component.

Ces aptitudes et attaques sont toutes inventoriées comme Items embarqués,
jamais comme documents racine.

## Tables et inventaires de butin

| EN page / FR scan | Élément | Classement | Décision proposée |
| --- | --- | --- | --- |
| 30-31 / 16 | `Scavenging in the Warehouse` | inventaire de jets, non RollTable autonome | Conserver comme contrôle ; les nombres de jets découlent du lieu et ne constituent pas une table de résultats. |
| 33-34 / 17-18 | corpse, briefcase et catwalk loot rolls | inventaires de jets, non RollTables autonomes | Contrôles seulement ; ne pas publier comme tables aléatoires. |
| 59 / 30 droite | `Random Ammunition` 2d20 | réimpression Core avec divergences | Réutiliser la table Core corrigée. EN donne `.45 Rounds (9+4 CD)` contre 8+4 dans le Core/FR ; Syringer passe par la table 1d9 canonique. Ajouter une apparence Starter, pas un doublon. |
| 59 / 30 droite | `Random Weapons` 1d20 | nouvelle variante mécanique | Créer une table Starter distincte : 20 résultats unitaires mêlant armes de tir et de mêlée, doublons conservés. Nom proposé `Random Weapons (Starter Set)` / `Armes aléatoires (Kit d'initiation)`. |
| 59 / 30 droite | `Random Chems` 1d20 | nouvelle variante mécanique | Créer une table Starter distincte : 20 résultats unitaires. Nom proposé `Random Chems (Starter Set)` / `Drogues aléatoires (Kit d'initiation)`. |
| 60 / 31 gauche | `Random Armor` 1d20 | nouvelle variante mécanique | Créer une table Starter distincte : Combat 1-2, Metal 3-5, Leather 6-12, Raider **13-20**. L'EN imprime `10-20`, qui chevauche Leather ; le FR corrige `13-20`. Nom proposé `Random Armor (Starter Set)` / `Armures aléatoires (Kit d'initiation)`. |
| 60 / 31 gauche | `Hit Locations` 1d20 | réimpression Core identique | Réutiliser la table Core, ajouter une apparence si cette occurrence est conservée comme dépendance ; aucun doublon. |
| 60 / 31 gauche | `Random Beverages` 2d20 | réimpression Core identique | Réutiliser la table Core et ajouter l'apparence Starter. |
| 60 / 31 gauche | `Random Publication` 1d20 | réimpression Core identique | Réutiliser la table Core et ajouter l'apparence Starter. |

## Couverture page par page EN et correspondance FR

| EN | Scan FR | Contenu structuré ou décision |
| --- | --- | --- |
| 1 | 1 | couverture, hors périmètre |
| 2-3 | 2 | crédits et sommaire, contrôles |
| 4-5 | 3 | introduction et cadre, non structuré |
| 6-7 | 4 | synopsis et début de l'acte 1, non structuré |
| 8-9 | 5 | présentation, Rast et piste de sang, non structuré |
| 10-11 | 6 | rencontre ; `Rad Rocky` et `Raider`, candidats |
| 12-13 | 7 | premier profil `Doctor Rast`, candidat ; règles de soin, contrôle |
| 14-15 | 8 | exploration de l'Abri 95, non structuré |
| 16-17 | 9 | rencontre de Mika et fouille, inventaires de scène seulement |
| 18-19 | 10 | ordinateur, fuite et arrivée du Mister Gutsy, non structuré |
| 20-21 | 11 | `Mister Gutsy`, candidat |
| 22-23 | 12 | mort de Mika, synopsis Boston, non structuré |
| 24-25 | 13 | nuit et scavenging ; inventaire de lieu seulement |
| 26-27 | 14 | rencontre et profil `Dog`, réimpression Core |
| 28-29 | 15 | entrepôt et ghouls, non structuré |
| 30-31 | 16 | `Feral Ghoul`, correction Core ; inventaire de jets de l'entrepôt |
| 32-33 | 17 | égouts et `Mirelurk Hatchling`, réimpression Core |
| 34-35 | 18 | inventaires briefcase/catwalk et rencontre reine, contrôles |
| 36-37 | 19 | `Mirelurk Queen, Wounded`, variante ; suite narrative |
| 38-39 | 20 | `Super Mutant`, réimpression corrigée |
| 40-41 | 21 | synopsis et progression, non structuré |
| 42-43 | 22 | Diamond City ; `Diamond City Security`, candidat |
| 44-45 | 23 | lieux et commerces, non structuré |
| 46-47 | 24 | `Commonwealth Merchant`, candidat |
| 48-49 | 25 | Rast/Clements, non structuré |
| 50-51 | 26 | bunker ; `Miss Nanny Clara`, candidate |
| 52-53 | 27 | Clara et G.E.C.K., non structuré |
| 54-55 | 28 | `Synth Replica` et second `Doctor Rast`, candidats/ambiguïté |
| 56-57 | 29 | conclusion et récompenses, non structuré |
| 58-59 | 30 | fins alternatives ; tables ammunition/weapons/chems |
| 60 | 31 gauche | tables armor/hit locations/beverages/publication |

Le scan 31 droite est la quatrième de couverture. Aucun Journal, Scene, plan,
personnage prétiré ou aide narrative n'est proposé à l'import.

## Décisions du propriétaire et correction encore demandée

1. Deux profils sont approuvés : `Doctor Rast` et `Doctor Rast (Revealed)`,
   avec leurs équivalents français localisés.
2. `Mirelurk Queen, Wounded` utilise le profil FR : 134 XP et 28/60 HP.
3. Le `Super Mutant` Starter reçoit une identité distincte et reste dans le
   dossier Starter avec les autres variantes de denizens.
4. Les variantes de denizens et les RollTables adaptées à l'initiation sont
   conservées dans des dossiers Starter dédiés.
5. Les cinq corrections suivantes sont approuvées au titre de la cohérence
   mécanique, avec le Core corrigé comme référence en cas de doute :
   **(a)** Rad Rocky avec TN/dégâts FR cohérents ; **(b)** Raider avec Tire Iron
   EN/Core à 4 CD ; **(c)** `.45 Rounds` à 8+4 CD ; **(d)** Random Armor avec
   Raider Armor 13-20 ; **(e)** marchand à 210 lb/105 kg, sans point de chance
   et sans qualité `Reliable` ajoutée uniquement en FR.
