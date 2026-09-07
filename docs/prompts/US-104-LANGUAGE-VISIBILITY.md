# Prompt - US-104 : ajouter le choix des langues visibles

Nous reprenons le projet privé `fallout2d20-compendium`, module bilingue
anglais/français pour Fallout 2d20 sur Foundry VTT v14+. Le dépôt local est la
source de travail.

Cette conversation doit réaliser exclusivement la user story
`US-104 - Ajouter le choix des langues visibles`. Ne commence aucune autre
story, notamment `US-105`.

`US-000`, `US-101`, `US-102` et `US-103` sont terminées et acceptées. Les
décisions consignées dans `docs/EDITORIAL-DECISIONS.md`,
`docs/NEXT-PHASE-USER-STORIES.md` et le contrat
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
   - `reports/us103-french-weight-qualification.md` ;
   - `CHANGELOG.md` ;
   - `README.md` ;
3. inspecter les instructions locales éventuelles (`AGENTS.md` ou équivalent) ;
4. vérifier que les implémentations et tests de US-102 et US-103 sont présents,
   que le registre contient toujours `core_rulebook`, que l'audit des poids
   passe et que le runtime de capacité FR reste couvert ;
5. préserver strictement toutes les modifications préexistantes qui ne
   t'appartiennent pas.

Objectif de US-104 :

- ajouter un réglage Foundry de portée client, individuel pour tous les rôles ;
- proposer exactement trois choix : anglais, français, ou les deux ;
- conserver les deux langues visibles par défaut afin de préserver le
  comportement V1.0.0 ;
- masquer uniquement les entrées de navigation des compendiums de la langue
  non sélectionnée ;
- ne jamais désenregistrer, supprimer, migrer ou rendre indisponible un pack
  masqué ;
- garantir que tous les UUID vers les packs masqués restent résolubles ;
- gérer l'initialisation, le changement du réglage et tout rechargement
  strictement nécessaire ;
- vérifier séparément le comportement MJ et joueur.

Décisions autoritatives :

- le choix est client-scoped, jamais world-scoped ;
- chaque utilisateur choisit indépendamment, quel que soit son rôle ;
- le MJ n'impose jamais son choix aux autres clients ;
- la valeur par défaut est « les deux » ;
- les packs masqués restent enregistrés et leurs UUID restent résolubles ;
- tous les packs restent catégoriels et publication-neutres ;
- les 40 identifiants et déclarations de packs V1 restent stables ;
- aucune donnée sous `src/packs/` ne doit être modifiée pour cette story ;
- `packs-v14/` est généré et ne doit jamais être modifié directement ;
- le registre et le schéma de provenance US-102 ne doivent pas être modifiés ;
- la correction des poids et capacités US-103 ne doit pas régresser.

Travail demandé :

1. inventorier le mécanisme Foundry v14 qui contrôle l'affichage des packs dans
   la navigation sans affecter leur enregistrement ni leur résolution ;
2. identifier les API et hooks stables disponibles dans Foundry v14 et le
   comportement du système Fallout 11.17.1 ;
3. proposer avant implémentation le nom technique du réglage, ses valeurs, ses
   libellés EN/FR, la stratégie de masquage et les fichiers concernés ;
4. soumettre au propriétaire toute ambiguïté réelle qui ne serait pas déjà
   couverte par les décisions autoritatives ;
5. implémenter le réglage client avec les trois choix et la valeur par défaut
   « les deux » ;
6. appliquer le choix au démarrage et lors d'un changement, avec le minimum de
   rechargement nécessaire ;
7. masquer seulement les entrées de navigation des 20 packs EN ou des 20 packs
   FR, sans toucher aux autres compendiums ;
8. vérifier par tests que `game.packs` conserve les 40 packs et que les UUID
   d'un pack masqué se résolvent encore ;
9. couvrir les trois valeurs, la valeur inconnue ou obsolète, le MJ, le joueur,
   l'indépendance entre clients, l'initialisation et le changement de réglage ;
10. conserver les tests de stabilité des IDs, `_key`, UUID et packs V1 ;
11. mettre à jour uniquement la documentation, les rapports nécessaires et le
    changelog relatifs à US-104 ;
12. exécuter les tests ciblés, `npm run ci` sans avertissement et une validation
    Foundry multi-rôle proportionnée dans un monde dédié ou une copie jetable.

Règles de travail :

- ne pas importer de publication ni de contenu ;
- ne pas modifier les poids, les capacités ou le runtime US-103 hors correction
  d'une régression directement causée par US-104 ;
- ne pas commencer la généralisation des audits de US-105 ;
- ne pas renommer de pack, document, fichier source ou identifiant V1 ;
- ne pas utiliser le monde utilisateur comme cible de test ;
- ne pas modifier directement `packs-v14/` ;
- préserver les modifications préexistantes étrangères à US-104.

Critères d'acceptation :

- le défaut « les deux » reproduit exactement la visibilité V1.0.0 ;
- anglais masque seulement les packs FR dans la navigation ;
- français masque seulement les packs EN dans la navigation ;
- les deux affiche les 40 packs ;
- chaque client conserve son propre choix et le MJ ne contrôle pas celui des
  joueurs ;
- aucun pack n'est désenregistré et les UUID masqués restent résolubles ;
- aucun contenu n'est créé, supprimé ou migré lors d'un changement ;
- les 2 764 identités racine, les 40 packs et leurs UUID restent stables ;
- les audits de provenance et de poids continuent de passer ;
- les tests ciblés passent et `npm run ci` réussit sans avertissement ;
- une validation Foundry multi-rôle confirme les trois choix, la persistance
  client et la résolution d'un UUID masqué.

À la fin, fournis :

- le contrat exact du réglage et sa portée ;
- le comportement observé pour chaque choix et chaque rôle ;
- la preuve que les packs restent enregistrés et les UUID résolubles ;
- la liste des fichiers modifiés ;
- les preuves de stabilité V1 et de non-régression US-102/US-103 ;
- les tests, audits, CI et validations Foundry exécutés ;
- les limites éventuelles ;
- une indication explicite permettant de savoir si `US-105` peut démarrer.

Ne commence pas US-105 dans cette conversation.
