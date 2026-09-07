# Prompt - US-103 : corriger et verrouiller les poids français

Nous reprenons le projet privé `fallout2d20-compendium`, module bilingue
anglais/français pour Fallout 2d20 sur Foundry VTT v14+. Le dépôt local est la
source de travail.

Cette conversation doit réaliser exclusivement la user story
`US-103 - Corriger et verrouiller les poids français`. Ne commence aucune autre
story, notamment `US-104`.

`US-000`, `US-101` et `US-102` sont terminées. Les décisions consignées dans
`docs/EDITORIAL-DECISIONS.md`, `docs/NEXT-PHASE-USER-STORIES.md` et le contrat
`docs/MULTI-PUBLICATION-REGISTRY.md` sont autoritatives : ne les rouvre pas.

Commence par :

1. vérifier l'état Git sans rien modifier ;
2. lire intégralement :
   - `docs/NEXT-PHASE-HANDOFF.md` ;
   - `docs/NEXT-PHASE-USER-STORIES.md` ;
   - `docs/MULTI-PUBLICATION-REGISTRY.md` ;
   - `docs/PROJECT.md` ;
   - `docs/V1-CONTENT-PLAN.md` ;
   - `docs/V14-QUALIFICATION.md` ;
   - `docs/EDITORIAL-DECISIONS.md` ;
   - `docs/TESTING.md` ;
   - `reports/v1-local-acceptance.md` ;
   - `reports/v1-post-release-qualification-2026-09-07.md` ;
   - `CHANGELOG.md` ;
   - `README.md` ;
3. inspecter les instructions locales éventuelles (`AGENTS.md` ou équivalent) ;
4. vérifier que l'implémentation et les tests de US-102 sont présents et que le
   registre contient toujours `core_rulebook` ;
5. préserver strictement toutes les modifications préexistantes qui ne
   t'appartiennent pas.

Objectif de US-103 :

- inventorier exhaustivement tous les poids français des documents racine et
  des documents embarqués ;
- prendre la mécanique anglaise Core erratée comme référence ;
- appliquer la convention française autoritative `kg = lb / 2` ;
- corriger les valeurs françaises incohérentes sans modifier aucun ID, UUID,
  pack, nom de document ou contenu hors poids ;
- ajouter un audit exhaustif empêchant le retour de poids anglais non convertis ;
- vérifier les conséquences éventuelles sur les Actors importés et leur
  capacité de charge.

Décisions autoritatives à respecter :

- l'anglais corrigé par Errata Log V6 (2026) est la référence mécanique Core ;
- la traduction française officielle reste la référence textuelle ;
- pour les poids français, la mécanique anglaise erratée convertie en
  kilogrammes prévaut lorsque la publication française est incohérente ;
- la convention des livres français est exactement `kg = lb / 2` ;
- toute exception à cette formule doit être vérifiée contre le PDF français,
  explicitement documentée et soumise au propriétaire avant correction ;
- aucune modification de provenance n'est nécessaire pour une correction de
  poids Core, sauf si le contrat US-102 l'exige réellement ;
- `system.source` et les flags de provenance restent conformes au registre ;
- tous les IDs, `_key`, UUID, identifiants et déclarations de packs V1 restent
  stables ;
- les sources JSON sous `src/packs/` sont autoritatives ;
- `packs-v14/` est généré et ne doit jamais être modifié directement.

Travail demandé :

1. localiser tous les champs susceptibles de représenter un poids ou une charge
   dans les Items et Actors anglais/français, y compris les Items embarqués ;
2. distinguer les véritables poids mécaniques des quantités, capacités,
   descriptions textuelles, modificateurs ou autres nombres sans rapport ;
3. produire un inventaire apparié EN/FR par pack, document, `_id`, chemin de
   champ et statut : correct, à corriger, exception potentielle, absent ou non
   comparable ;
4. déterminer si les valeurs anglaises sources nécessitent déjà une correction
   d'errata avant conversion ;
5. contrôler les types numériques, les zéros, les valeurs absentes, les
   fractions et les règles d'arrondi réellement utilisées par le système ;
6. examiner les Actors et leurs Items embarqués séparément, sans supposer que
   les documents racine couvrent leurs copies ;
7. identifier les calculs ou affichages de capacité de charge du système qui
   pourraient dépendre de ces champs, sans modifier le runtime hors nécessité
   démontrée ;
8. soumettre au propriétaire toute exception ou ambiguïté réelle avant de
   l'implémenter ;
9. après résolution des ambiguïtés, corriger uniquement les champs de poids
   français concernés ;
10. ajouter un audit déterministe qui compare exhaustivement chaque poids FR à
    la valeur EN canonique divisée par deux et produit un diagnostic précis
    incluant pack, document, ID et chemin de champ ;
11. ajouter les tests couvrant au minimum les documents racine, les documents
    embarqués, les valeurs nulles/absentes, les fractions, les éventuelles
    exceptions approuvées, les types non numériques et la stabilité des
    identités V1 ;
12. mettre à jour uniquement la documentation, les rapports nécessaires et le
    changelog relatifs à US-103.

Avant toute correction, présente au propriétaire :

- l'inventaire des chemins de poids trouvés ;
- les règles exactes de comparaison et d'arrondi proposées ;
- le nombre de documents racine et embarqués concernés par pack ;
- la liste des divergences et exceptions potentielles ;
- les fichiers qui seraient modifiés ;
- la stratégie de stabilité des IDs et UUID.

Si une exception, un arrondi ou une interprétation exige une décision non déjà
couverte, attends l'accord du propriétaire avant de corriger les cas concernés.
Pour les conversions strictement couvertes par `kg = lb / 2`, poursuis après
avoir présenté l'inventaire.

Règles de travail :

- ne pas importer de nouvelle publication ;
- ne pas modifier le registre ou le schéma de provenance sauf défaut bloquant
  démontré de US-102 ;
- ne pas ajouter le réglage de visibilité des langues ;
- ne pas modifier les descriptions, noms, images, liens, recettes, effets ou
  autres données éditoriales ;
- ne pas généraliser ou réécrire les régressions Core sans nécessité pour les
  poids ;
- ne pas renommer de pack, document, fichier source ou identifiant V1 ;
- ne pas lancer de migration sur un monde utilisateur ;
- ne jamais utiliser le monde utilisateur comme cible de test ;
- toute migration éventuelle doit être strictement nécessaire, compatible et
  testée uniquement sur des fixtures ou copies isolées ;
- ne pas modifier directement `packs-v14/` ;
- préserver les modifications préexistantes étrangères à US-103.

Critères d'acceptation :

- chaque poids français attendu vaut la valeur anglaise canonique divisée par
  deux, sauf exception explicitement approuvée et documentée ;
- les documents racine et embarqués sont tous couverts ;
- les valeurs sont numériques et utilisables par le système Fallout ;
- l'audit échoue sur toute valeur anglaise non convertie, valeur non numérique,
  paire manquante ou divergence non approuvée, avec diagnostic précis ;
- les effets éventuels sur les Actors et leur capacité de charge sont vérifiés ;
- aucun ID, `_key`, UUID ou pack V1 n'a changé ;
- les tests ciblés passent ;
- `npm run ci` réussit sans avertissement ;
- une validation Foundry proportionnée vérifie un échantillon représentatif de
  poids et d'Actors dans un monde dédié ou une copie jetable, jamais dans le
  monde utilisateur ;
- aucune tâche de US-104 ou d'une story ultérieure n'est commencée.

À la fin, fournis :

- le résumé de l'inventaire et les chemins de poids couverts ;
- la règle de conversion et d'arrondi effectivement appliquée ;
- la liste exacte des corrections et des exceptions approuvées ;
- la liste des fichiers modifiés ;
- les preuves de stabilité des IDs et UUID V1 ;
- les tests, audits, CI et validations Foundry exécutés avec leurs résultats ;
- les éventuelles limites ou suites destinées aux stories suivantes ;
- une indication explicite permettant de savoir si `US-104` peut démarrer.

Ne commence pas US-104 dans cette conversation.
