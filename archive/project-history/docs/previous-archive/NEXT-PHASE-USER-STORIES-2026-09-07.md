# Backlog de travail après la V1

## Statut et mode d'emploi

Ce document découpe la phase suivant la V1.0.0 en user stories pouvant être confiées à des conversations séparées. `US-000` a été acceptée par le propriétaire le 2026-09-07 ; les décisions ci-dessous sont donc autoritatives pour les stories suivantes.

Avant toute intervention, chaque conversation doit lire intégralement :

- `docs/NEXT-PHASE-HANDOFF.md` ;
- `docs/PROJECT.md` ;
- `docs/V1-CONTENT-PLAN.md` ;
- `docs/V14-QUALIFICATION.md` ;
- `docs/EDITORIAL-DECISIONS.md` ;
- `docs/TESTING.md` ;
- `reports/v1-local-acceptance.md` ;
- `CHANGELOG.md` ;
- `README.md` ;
- le présent document.

Chaque conversation doit vérifier l'état Git avant d'agir, préserver les modifications qui ne lui appartiennent pas et ne traiter que la story demandée. Les sources JSON sous `src/packs/` sont autoritatives. Les packs LevelDB sont générés et ne doivent jamais être modifiés directement. Les PDF restent sous `pdf/`, qui est ignoré par Git.

Sauf mention contraire, une story d'implémentation est terminée lorsque ses critères d'acceptation sont satisfaits, la documentation et le changelog sont à jour, les tests ciblés passent et `npm run ci` réussit. Une validation Foundry proportionnée est requise dès qu'une story touche au manifeste, au runtime, aux packs, aux UUID ou au comportement visible.

## Décisions déjà acquises

- Le module reste indépendant de toute publication particulière.
- Les compendiums anglais et français restent indépendants, exhaustifs et utilisables par glisser-déposer.
- L'anglais erraté est la référence mécanique. La traduction française officielle est utilisée lorsqu'elle existe.
- En l'absence de traduction officielle, une traduction française de projet peut être produite après recherche de la terminologie établie. Toute adaptation qui s'éloigne sensiblement du matériel est soumise au propriétaire.
- `system.source` conserve la publication la plus ancienne d'un élément.
- Une réimpression identique ne crée pas de nouvelle fiche et ne change pas la source.
- Une version mécaniquement différente sous le même nom reçoit une fiche et un identifiant distincts. Son nom d'affichage est décidé au cas par cas.
- Une réédition corrigée sous le même nom est soumise au propriétaire avant modification de la fiche canonique.
- Pour les poids français, la mécanique anglaise erratée convertie en kilogrammes fait foi lorsque la publication française est incohérente. La convention des livres français est `kg = lb / 2`.
- Les versions envisagées sont `1.0.1` pour la consolidation hors illustrations, `1.0.2` pour les illustrations et `1.1.0` pour le GM Toolkit et le Starter Set.
- Tous les packs sont catégoriels et couvrent l'intégralité de la gamme. Aucun pack n'est propre à une publication. Les RollTables sont classées dans des folders par publication ; d'autres packs peuvent recevoir des folders par type d'élément sans changer leur identité.
- `system.source` reste la source unique de première apparition. Une liste structurée des apparitions par publication est maintenue dans les flags et contrôlée par les catalogues et audits.
- Le choix des packs visibles est un réglage client proposant anglais, français ou les deux, avec les deux langues par défaut. Il est individuel pour tous les rôles, n'est pas imposé par le MJ et ne désenregistre jamais les packs masqués : leurs UUID restent résolubles.
- Le Starter Set apporte uniquement ses Actors, Items, capacités, attaques et tables aléatoires réutilisables. Les Journals d'aventure, scènes, cartes, prétirés et autres aides non structurées sont exclus de `1.1.0`.
- Pour le GM Toolkit, les RollTables publiables sont la table de type de rencontre, les cinq tables de rencontres détaillées et les générateurs de lieux définissant une procédure aléatoire et des plages de dés complètes. Les tableaux statiques de règles, voyage, terrain, équipement et butin redondant servent de contrôles. Les traductions françaises de projet sont signalées dans les flags et la documentation, jamais dans le nom affiché.
- Une variante mécanique homonyme reçoit de préférence un qualificatif officiel ou mécanique clair ; à défaut, son nom est suffixé par le titre localisé abrégé de la publication. Le nom exact est validé dans l'inventaire avant création. Une réimpression ou apparition secondaire identique ne reçoit aucun suffixe.
- Les illustrations peuvent provenir des PDF officiels détenus, d'assets officiels des jeux fournis par le propriétaire ou d'autres assets Modiphius/Bethesda explicitement approuvés, avec provenance conservée. Les images générées, fan arts, images Web et sources sans autorisation claire sont exclues.
- Chaque lot est qualifié sur la dernière version stable de Foundry v14 disponible à son démarrage avec la dernière version stable compatible du système Fallout, ainsi que sur le couple précédemment qualifié tant qu'il reste disponible. Foundry v15 exige une décision séparée. La qualification locale est obligatoire et Oracle est un gate pré-release pour `1.0.1`, `1.0.2` et `1.1.0`, sauf dérogation explicite et documentée du propriétaire.

## Dépendances globales

```text
US-000
  -> US-101 -> US-102 -> US-103 -> US-104 -> US-105
                                      \------> US-106
  -> US-201 -> US-202/US-203/US-204 -> US-205
  -> US-301 -> US-303 --\
  -> US-302 -> US-304 ---+-> US-305 -> US-306
```

Les stories placées sur une même branche du graphe peuvent être préparées séparément, mais elles ne doivent pas modifier simultanément les mêmes fichiers. Les stories d'acceptation et de livraison sont toujours exécutées après fusion des stories dont elles dépendent.

## Cadrage fermé

### US-000 - Fermer les décisions structurantes

**Statut** : acceptée par le propriétaire le 2026-09-07.

**En tant que** propriétaire du module, **je veux** arrêter les décisions encore ouvertes **afin que** les lots d'implémentation ne choisissent pas implicitement une architecture ou un périmètre éditorial.

Décisions obtenues :

1. packs catégoriels fusionnés ou séparation de certaines publications, notamment les RollTables ;
2. stockage éventuel des apparitions secondaires uniquement dans les catalogues/rapports ou également dans les flags ;
3. portée monde ou client du choix de langue, valeur par défaut et traitement du MJ ;
4. inclusion ou exclusion des Journals, scènes, cartes et prétirés du Starter Set ;
5. sélection des tables narratives du GM Toolkit et mode de traduction française ;
6. règle de nommage des variantes homonymes ;
7. sources d'illustrations autorisées : PDF, assets officiels des jeux, génération ou autres ;
8. matrice de compatibilité Foundry/Fallout et statut du déploiement Oracle dans les gates de release.

**Livrables**

- décisions ajoutées à `docs/EDITORIAL-DECISIONS.md` ;
- architecture et périmètres confirmés dans ce document ;
- aucune modification de code ou de contenu.

**Critères d'acceptation**

- [x] chaque point possède une décision explicite, ses motifs et ses compromis ;
- [x] aucune story suivante ne dépend encore d'un choix implicite.

**Vérification des prérequis des stories suivantes**

- `US-101` ne dépend plus d'un arbitrage structurel et est la prochaine story prête à démarrer ; les résultats Oracle V1 et retours utilisateurs qu'elle demande sont des entrées factuelles à collecter, non des décisions manquantes de `US-000`.
- `US-102` dispose des décisions sur les packs, folders, première source et apparitions secondaires.
- `US-103` dispose de la règle mécanique des poids et pourra s'appuyer sur le schéma livré par `US-102`.
- `US-104` dispose de la portée, des rôles, de la valeur par défaut et du contrat de résolution des UUID ; elle attend la séquence `US-101` à `US-103` prévue par le graphe.
- `US-105` dispose des politiques de provenance, doublons, variantes, traductions et illustrations ; elle attend `US-102`.
- `US-106`, `US-205` et `US-306` disposent de la matrice de compatibilité et du statut du gate Oracle ; elles attendent seulement leurs stories de réalisation respectives.
- `US-201` à `US-204` disposent de la politique des sources d'illustrations et conservent leurs validations de lots prévues.
- `US-301` et `US-303` disposent du périmètre présomptif du GM Toolkit et de la règle de traduction de projet ; la liste page par page reste volontairement un livrable de `US-301`, pas un arbitrage implicite.
- `US-302` et `US-304` disposent du périmètre Starter Set et de la règle de nommage ; l'inventaire exact reste volontairement un livrable de `US-302`.
- `US-305` dispose des règles de première apparition, réimpression et variantes ; elle attend les imports approuvés de `US-303` et `US-304`.

**Prompt de lancement**

Le prompt autonome à utiliser dans une nouvelle conversation est fourni dans
`docs/prompts/US-000-CLOSE-FRAMING.md`.

## Version 1.0.1 - Consolidation et fondation multi-publications

### US-101 - Qualifier la dette et la validation terrain de la V1

**En tant que** mainteneur, **je veux** disposer d'un état de référence post-release **afin que** la consolidation parte de défauts vérifiés.

**Travail**

- enregistrer le résultat du déploiement Oracle de V1.0.0, s'il a eu lieu ;
- inventorier les défauts et irritants signalés depuis la release ;
- distinguer les défauts bloquants, la dette planifiée et les améliorations facultatives ;
- ne corriger aucun défaut hors d'une story approuvée.

**Ce qui incombe au propriétaire**

- fournir le résultat Oracle et les retours utilisateurs disponibles ;
- arbitrer la priorité des défauts nouvellement découverts.

**Critères d'acceptation**

- un rapport daté décrit l'environnement, les résultats et les suites ;
- chaque anomalie possède une priorité et une destination de version.

### US-102 - Concevoir et mettre en place le registre multi-publications

**En tant que** mainteneur, **je veux** remplacer les hypothèses Core codées en dur par un registre de publications **afin que** les nouveaux livres soient intégrés sans fragiliser les identifiants V1.

**Travail**

- inventorier tous les usages de `SOURCE_ID`, `core_rulebook` et des conventions `core-*` ;
- définir un registre stable de publications avec identifiant, titres EN/FR, éditions, langues et errata ;
- formaliser et valider le schéma de provenance ;
- préserver `system.source` comme première apparition unique et ajouter la liste structurée des apparitions secondaires dans les flags ;
- préserver tous les IDs et UUID de V1 ;
- conserver exclusivement des packs catégoriels ; définir les folders de publication des RollTables et les conventions de folders taxonomiques sans créer de packs par publication ;
- définir la convention des catalogues et rapports par publication ;
- couvrir la lecture des flags V1 existants et leur éventuelle migration compatible.

**Dépendance** : `US-000`.

**Critères d'acceptation**

- le Core est déclaré dans le registre sans changement de document ni d'UUID ;
- les nouvelles publications peuvent être déclarées sans créer une nouvelle constante globale ;
- les provenances invalides ou inconnues échouent avec un diagnostic précis ;
- des tests couvrent la compatibilité des données V1.

### US-103 - Corriger et verrouiller les poids français

**Statut** : acceptée par le propriétaire le 2026-09-07 après validation dans Foundry.

**En tant que** joueur francophone, **je veux** des poids exprimés correctement en kilogrammes **afin que** les fiches correspondent à la convention mécanique française.

**Travail**

- inventorier tous les champs de poids des documents racine et des documents embarqués ;
- prendre l'anglais erraté comme base mécanique ;
- appliquer `kg = lb / 2`, en vérifiant les exceptions contre le PDF français ;
- soumettre toute exception ou ambiguïté au propriétaire ;
- corriger les sources françaises sans modifier les IDs ;
- ajouter un audit exhaustif empêchant le retour de valeurs anglaises non converties ;
- vérifier les effets éventuels des poids sur les Actors importés et leur capacité de charge.

**Dépendances** : `US-000`, puis modèle de provenance stabilisé par `US-102` si les corrections doivent enregistrer une décision de source.

**Critères d'acceptation**

- chaque poids français attendu est égal à la valeur anglaise canonique divisée par deux, sauf exception approuvée et documentée ;
- les documents racine et embarqués sont couverts ;
- les valeurs sont numériques et utilisables par le système Fallout ;
- un échantillon représentatif est validé visuellement dans Foundry.

### US-104 - Ajouter le choix des langues visibles

**En tant que** MJ, **je veux** choisir les langues affichées **afin de** ne voir que les compendiums utiles à mon monde.

**Travail**

- implémenter un réglage client individuel pour tous les rôles, sans forçage par le MJ, avec les deux langues par défaut ;
- proposer anglais, français ou les deux ;
- masquer les packs sans supprimer leur contenu ni casser les UUID ;
- masquer uniquement les entrées de navigation et conserver les packs enregistrés ;
- gérer proprement l'initialisation, le changement de réglage et le rechargement éventuel ;
- vérifier le comportement pour le MJ et les joueurs ;
- documenter comment rétablir une langue masquée.

**Dépendances** : `US-000` et décision définitive sur l'organisation des packs.

**Critères d'acceptation**

- la valeur par défaut préserve le comportement de V1.0.0 ;
- chacun des trois choix produit l'affichage attendu ;
- les liens UUID vers un pack masqué restent résolubles ;
- aucun contenu n'est créé, supprimé ou migré lors d'un changement ;
- les tests automatisés et un test multi-rôle dans Foundry passent.

### US-105 - Généraliser les audits, catalogues et tests

**En tant que** mainteneur, **je veux** que les contrôles qualité raisonnent par publication **afin que** l'ajout d'un livre ne réduise pas la couverture obtenue en V1.

**Travail**

- rendre génériques les contrôles actuellement spécialisés Core lorsque cela apporte une réutilisation réelle ;
- conserver les régressions éditoriales propres au Core lorsqu'elles ne sont pas généralisables ;
- contrôler provenance, parité linguistique, UUID, doublons, variantes, traductions, errata, images et inventaires par publication ;
- distinguer réimpression identique, correction et variante mécanique ;
- produire des diagnostics exploitables sans réécrire automatiquement les inventaires attendus.

**Dépendance** : `US-102`.

**Critères d'acceptation**

- une publication vide ou pilote peut être auditée sans modifier les tests Core ;
- une provenance, une collision d'ID, un doublon non approuvé ou un lien interlangue erroné fait échouer la CI ;
- `npm run ci` conserve toutes les garanties V1.

### US-106 - Qualifier et livrer la V1.0.1

**En tant que** propriétaire, **je veux** une release de consolidation reproductible **afin que** la fondation multi-publications et les corrections puissent être déployées indépendamment des nouveaux contenus.

**Dépendances** : `US-101` à `US-105` et toute correction V1 explicitement ajoutée au périmètre.

**Critères d'acceptation**

- version, manifeste, README et changelog sont cohérents avec `1.0.1` ;
- CI complète sans avertissement ;
- scénario navigateur et revue humaine couvrent poids FR, visibilité des langues, imports et UUID ;
- archive vérifiée et procédure de retour arrière documentée ;
- qualification sur la matrice v14/Fallout décidée dans `US-000` et gate Oracle pré-release passé, sauf dérogation explicite et documentée ;
- aucun changement d'ID ou d'UUID V1 non approuvé.

## Version 1.0.2 - Complétude des illustrations

### US-201 - Établir l'inventaire et le protocole d'illustrations

**En tant que** responsable éditorial, **je veux** un inventaire actionnable des placeholders **afin de** traiter les illustrations par lots contrôlables.

**Travail**

- produire une ligne canonique par paire EN/FR, et non deux tâches identiques ;
- classer chaque document par publication, pack, importance et statut actuel ;
- identifier les groupes pouvant légitimement partager une image ;
- limiter les candidats aux extractions des PDF officiels détenus, aux assets officiels fournis par le propriétaire et aux autres assets Modiphius/Bethesda explicitement approuvés ; exclure génération, fan arts, images Web et sources sans autorisation claire ;
- définir les preuves de source et autorisations à conserver ;
- produire des planches de contact ou rapports facilitant la revue ;
- prioriser Actors/créatures, équipement emblématique, consommables/publications, puis mods et éléments génériques.

**Dépendance** : politique de sources décidée dans `US-000`.

**Ce qui incombe au propriétaire**

- fournir les assets officiels hors PDF ;
- valider les partages d'image et les exceptions de provenance.

**Critères d'acceptation**

- les 544 placeholders canoniques V1 sont chacun présents exactement une fois dans l'inventaire ;
- chaque ligne possède une priorité, une source candidate ou un motif de blocage ;
- aucun remplacement d'image n'est réalisé dans cette story.

### US-202 - Illustrer les Actors et créatures prioritaires

**En tant que** MJ, **je veux** reconnaître rapidement les personnages et adversaires **afin que** les compendiums soient immédiatement lisibles en jeu.

**Dépendance** : `US-201` et fourniture/validation des images du lot.

**Critères d'acceptation**

- chaque remplacement est carré, en WebP, idéalement inférieur à 150 Kio et jamais supérieur à 300 Kio sans exception ;
- les paires EN/FR utilisent la même image et le même statut ;
- les partages sont pertinents et approuvés ;
- le rapport des placeholders et les flags sont à jour ;
- une planche de contact et un contrôle Foundry permettent la revue humaine.

### US-203 - Illustrer l'équipement prioritaire

Même contrat que `US-202`, appliqué par lots séparés aux armes, armures, munitions, consommables et publications. Une conversation ne doit traiter qu'un volume permettant une revue visuelle exhaustive.

### US-204 - Illustrer les mods et éléments génériques restants

Même contrat que `US-202`, après validation des règles de partage. Les placeholders sans source acceptable restent explicitement suivis et ne sont pas remplacés par une image approximative.

### US-205 - Qualifier et livrer la V1.0.2

**Dépendances** : lots graphiques retenus pour la release.

**Critères d'acceptation**

- objectif chiffré de réduction des placeholders atteint ;
- aucune image orpheline, manquante, non carrée ou hors limite non approuvée ;
- revue visuelle des planches de contact et de Foundry acceptée ;
- CI, archive, documentation et changelog passent ; la matrice v14/Fallout et le gate Oracle pré-release sont satisfaits, sauf dérogation explicite et documentée ;
- la release ne prétend pas à la complétude si des placeholders subsistent.

## Version 1.1.0 - GM Toolkit et Starter Set

### US-301 - Inventorier et comparer le GM Toolkit au Core

**En tant que** responsable éditorial, **je veux** un inventaire du GM Toolkit **afin de** distinguer les contrôles, les tables publiables et les éventuels nouveaux éléments.

**Source disponible** : `MUH052193 Fallout - GM's Toolkit Booklet [2021-04-22].pdf`, anglais uniquement.

**Travail**

- inventorier les tables aléatoires, tableaux d'équipement et règles optionnelles ;
- comparer chaque ligne d'équipement au Core anglais erraté ;
- classer les écarts en identique, errata déjà appliqué, contradiction, nouvel élément ou ambiguïté ;
- proposer la liste exacte des RollTables à publier ;
- prendre comme périmètre présomptif la table de type de rencontre, les cinq tables de rencontres détaillées et les générateurs de lieux possédant une procédure et des plages complètes ; traiter les autres tableaux comme contrôles ;
- préparer les besoins de traduction française sans encore importer en masse ;
- prévoir le marquage de la traduction française de projet dans les flags et la documentation, sans suffixe dans les noms.

**Dépendances** : `US-000`, `US-102` et `US-105`.

**Critères d'acceptation**

- chaque contenu structuré du livret est inventorié avec page et décision proposée ;
- aucun écart mécanique n'est résolu silencieusement ;
- les tables de référence identiques ne créent pas de doublons ;
- le propriétaire valide le périmètre d'import avant `US-303`.

### US-302 - Inventorier et comparer le Starter Set EN/FR au Core

**En tant que** responsable éditorial, **je veux** une matrice bilingue du Starter Set **afin de** distinguer les reprises du Core des profils et tables propres à l'aventure.

**Sources disponibles** : aventure EN de 60 pages et édition française `Il était une fois au Commonwealth` de 31 doubles pages scannées.

**Travail**

- aligner les paginations EN et FR ;
- inventorier les Actors, objets, attaques, capacités, inventaires et tables ;
- comparer chaque élément au Core anglais erraté et aux documents V1 ;
- classer chaque occurrence selon la politique de doublons/révisions ;
- relever les divergences de traduction ou de mécanique ;
- proposer le périmètre exact à importer ;
- exclure explicitement Journals d'aventure, scènes, cartes, prétirés et autres aides non structurées de `1.1.0`.

**Dépendances** : `US-000`, `US-102` et `US-105`.

**Critères d'acceptation**

- chaque profil et table du Starter possède une correspondance EN/FR et une décision proposée ;
- les reprises strictes du Core réutilisent leurs IDs/UUID ;
- les variantes mécaniques proposées possèdent une justification et un futur ID distinct ;
- toute correction ambiguë est soumise au propriétaire avant `US-304`.

### US-303 - Intégrer les tables approuvées du GM Toolkit

**En tant que** MJ, **je veux** utiliser les tables pertinentes du GM Toolkit **afin de** générer lieux, rencontres et butin directement dans Foundry.

**Travail**

- intégrer uniquement le périmètre validé dans `US-301` ;
- produire des versions EN et FR exhaustives ;
- marquer les traductions de projet selon le schéma de provenance ;
- utiliser des UUID locaux lorsque le résultat désigne un document existant ;
- conserver du texte lorsque le résultat est narratif et ne correspond à aucun document ;
- tester formules, plages, pondérations, récursion et tirages.

**Critères d'acceptation**

- chaque ligne source apparaît exactement une fois avec sa probabilité correcte ;
- les deux langues sont mécaniquement équivalentes ;
- tous les UUID se résolvent dans la bonne langue ;
- un tirage réel de chaque table passe dans Foundry.

### US-304 - Intégrer les contenus approuvés du Starter Set

**En tant que** MJ, **je veux** disposer des profils et tables réutilisables du Starter Set **afin de** préparer l'aventure sans recréer ses éléments structurés.

**Travail**

- intégrer uniquement le périmètre validé dans `US-302` ;
- réutiliser les documents Core identiques ;
- créer des IDs stables pour les nouveaux profils et variantes ;
- nommer les variantes homonymes avec un qualificatif officiel ou mécanique clair, ou à défaut avec le titre localisé abrégé de la publication, après validation de chaque nom dans l'inventaire ;
- préserver la parité EN/FR, les équipements embarqués et les UUID locaux ;
- appliquer la mécanique anglaise canonique et adapter le français ;
- suivre les illustrations manquantes conformément au protocole V1.0.2.

**Critères d'acceptation**

- les inventaires approuvés sont complets ;
- aucun doublon strict du Core n'est créé ;
- les Actors importés conservent tous leurs éléments embarqués ;
- les tables ont leurs probabilités correctes et leurs liens résolvent ;
- glisser-déposer, fiches et tirages passent dans Foundry dans les deux langues.

### US-305 - Auditer les interactions multi-publications

**En tant que** mainteneur, **je veux** contrôler les interactions entre Core, Toolkit et Starter **afin de** prévenir doublons, liens cassés et révisions silencieuses.

**Dépendances** : `US-303` et `US-304`.

**Critères d'acceptation**

- aucun ID n'est instable ou dupliqué dans son pack ;
- chaque homonyme est classé et approuvé ;
- chaque réimpression identique renvoie au document canonique le plus ancien ;
- chaque divergence mécanique possède une décision éditoriale ;
- les catalogues permettent de prouver la complétude de chaque publication sans dupliquer les documents.

### US-306 - Qualifier et livrer la V1.1.0

**Dépendances** : `US-301` à `US-305`.

**Critères d'acceptation**

- inventaires GM Toolkit et Starter complets et approuvés ;
- parité EN/FR, provenance, traductions de projet et décisions ambiguës vérifiées ;
- CI, compilation LevelDB et archive reproductibles ;
- navigateur automatisé étendu aux nouvelles tables et aux nouveaux profils ;
- revue humaine Foundry couvrant tous les nouveaux packs/dossiers, tirages, liens et glisser-déposer ;
- compatibilité vérifiée selon la matrice décidée dans `US-000` ;
- compatibilité qualifiée sur la dernière version stable de Foundry v14 disponible au démarrage du lot avec la dernière version stable compatible de Fallout, plus le couple précédemment qualifié s'il reste disponible ;
- gate Oracle pré-release passé, sauf dérogation explicite et documentée ;
- version, manifeste, README, changelog et notes de release cohérents avec `1.1.0`.

## Critères de fin de phase

La phase décrite par ce backlog est terminée lorsque :

1. V1.0.1, V1.0.2 et V1.1.0 ont chacune satisfait leurs gates ou qu'une décision éditoriale a explicitement supprimé l'un de ces jalons ;
2. les poids français sont exhaustivement corrigés et protégés par régression ;
3. le choix des langues est stable et ne casse aucun UUID ;
4. Core, GM Toolkit et Starter Set possèdent des inventaires de non-régression ;
5. les doublons, variantes et révisions sont tous classés selon la politique approuvée ;
6. les placeholders restants, s'il y en a, sont connus, justifiés et chiffrés ;
7. tous les contenus publiés sont bilingues, utilisables par glisser-déposer et qualifiés dans Foundry ;
8. les releases sont reproductibles et validées selon la politique locale/Oracle approuvée.
