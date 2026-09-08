# Prompt - US-000 : fermer les décisions structurantes

Nous reprenons le projet privé `fallout2d20-compendium`, module bilingue anglais/français pour Fallout 2d20 sur Foundry VTT v14+. Le dépôt local est la source de travail.

Cette conversation doit réaliser exclusivement la user story `US-000 - Fermer les décisions structurantes`. Il s'agit d'une phase de cadrage : ne modifie aucun code, contenu JSON, pack, manifeste ou asset et n'implémente aucune fonctionnalité.

Commence par :

1. vérifier l'état Git sans rien modifier ;
2. lire intégralement les documents suivants :
   - `docs/NEXT-PHASE-HANDOFF.md` ;
   - `docs/NEXT-PHASE-USER-STORIES.md` ;
   - `docs/PROJECT.md` ;
   - `docs/V1-CONTENT-PLAN.md` ;
   - `docs/V14-QUALIFICATION.md` ;
   - `docs/EDITORIAL-DECISIONS.md` ;
   - `docs/TESTING.md` ;
   - `reports/v1-local-acceptance.md` ;
   - `CHANGELOG.md` ;
   - `README.md` ;
3. inspecter en lecture seule les fichiers d'architecture utiles, notamment `scripts/config.mjs`, `module.base.json`, `runtime/fallout-v14-compat.mjs`, `catalog/`, `test/` et `.github/workflows/` ;
4. tenir compte des PDF actuellement présents dans le dossier ignoré `pdf/`, sans les déplacer ni les modifier.

Les décisions déjà acquises sont autoritatives :

- le module reste publication-neutral ;
- les compendiums EN et FR restent indépendants, exhaustifs et utilisables par glisser-déposer ;
- l'anglais erraté est la référence mécanique ;
- la traduction française officielle est utilisée lorsqu'elle existe ;
- sans traduction officielle, une traduction française de projet peut être préparée après recherche de la terminologie établie, mais toute adaptation sensiblement éloignée du matériel doit être soumise au propriétaire ;
- `system.source` conserve la publication la plus ancienne ;
- une réimpression identique ne crée pas de fiche et ne change pas la source ;
- une réédition corrigée sous le même nom nécessite un arbitrage avec le propriétaire ;
- une variante mécaniquement différente sous le même nom reçoit une nouvelle fiche et un nouvel ID, avec nom d'affichage décidé au cas par cas ;
- pour les poids français, l'anglais erraté converti selon `kg = lb / 2` prévaut lorsque le matériel français est incohérent ;
- les jalons envisagés sont `v1.0.1` pour la consolidation hors illustrations, `v1.0.2` pour les illustrations et `v1.1.0` pour le GM Toolkit et le Starter Set ;
- aucun support de Foundry antérieur à v14 ni de `fallout-fr` n'est requis.

Ton objectif est d'obtenir et de documenter des décisions explicites sur les huit sujets suivants :

1. stratégie de packs : packs catégoriels fusionnés ou séparation de certaines publications, notamment les RollTables ;
2. provenance : apparitions secondaires conservées uniquement dans les catalogues/rapports ou également dans les flags des documents ;
3. choix des langues visibles : portée monde ou client, valeur par défaut, comportement du MJ et maintien de la résolution des UUID masqués ;
4. Starter Set : inclusion ou exclusion des Journals, scènes, cartes, prétirés et autres aides d'aventure ;
5. GM Toolkit : quelles tables narratives/aléatoires publier, lesquelles utiliser seulement comme contrôles, et comment signaler la traduction française de projet ;
6. nommage des variantes homonymes ;
7. sources d'illustrations autorisées : extractions des PDF, assets officiels des jeux, images générées ou autres sources ;
8. politique de compatibilité et de livraison : versions Foundry/Fallout à tester et rôle du déploiement Oracle dans les gates de release.

Pour chaque sujet :

- expose brièvement les faits observés dans le dépôt ou les PDF ;
- formule une recommandation claire ;
- présente les principaux compromis et risques ;
- pose une question de décision précise ;
- procède en plusieurs vagues si cela facilite les réponses ;
- n'invente pas de décision en cas d'ambiguïté.

Lorsque les huit décisions ont été obtenues :

1. récapitule-les au propriétaire pour validation finale ;
2. après validation explicite, mets uniquement à jour les documents de cadrage concernés, notamment `docs/EDITORIAL-DECISIONS.md` et `docs/NEXT-PHASE-USER-STORIES.md` ;
3. vérifie que chaque story ultérieure possède désormais tous ses prérequis ;
4. fournis une synthèse des décisions, de leurs conséquences architecturales, des risques résiduels et de la prochaine story prête à démarrer ;
5. ne commence pas cette story suivante dans la même conversation.

La user story est terminée seulement si les huit décisions sont explicites, validées et documentées, sans changement d'implémentation.
