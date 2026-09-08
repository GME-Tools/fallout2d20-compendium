# Protocole d’inventaire et de revue des illustrations

Ce protocole gouverne US-201 et prépare les décisions nécessaires à une future story d’intégration. US-201 ne remplace, ne crée et ne modifie aucune illustration.

## Sources et fichiers

- `src/packs/en/` et `src/packs/fr/` restent les sources métier en lecture seule pour ce processus.
- `artwork/inventory/us-201-artwork-inventory.jsonl` est l’inventaire de revue : une ligne JSON par identité canonique, donc une seule décision pour la paire EN/FR.
- `artwork/inventory/us-201-contact-sheets.html` est la représentation visuelle autonome et recherchable.
- `reports/us-201-artwork-inventory-summary.md` contient les agrégats reproductibles.
- `reports/us-201-images-to-find.md` est la checklist lisible à transmettre au propriétaire; une proposition peut être renvoyée en citant simplement l'identité et un lien officiel autorisé ou un chemin local.

Le générateur recalcule les champs structurels depuis les JSON et conserve les champs éditoriaux de l’inventaire existant. `npm run artwork:inventory:check` valide les références et compare exactement les sorties attendues, ce qui détecte toute dérive non déterministe.

## Champs et responsabilités

Les champs `identity` à `current_status` sont dérivés : identité, ID, UUID EN/FR, noms, publication, pack, types, image et statut. Ils ne doivent pas être édités. Les champs suivants sont éditoriaux : priorité, groupe et statut de partage, nature/source/localisateur du candidat, preuve attendue, blocage, état de revue et décision propriétaire.

Priorités : `P1` Actors, créatures et capacités de créature; `P2` équipement emblématique; `P3` consommables, dépendances, maladies, publications et tables; `P4` mods et éléments génériques. Une modification manuelle de priorité est permise si elle est motivée lors de la revue.

## Sélection et provenance

Seules trois familles sont recevables : extraction d’un PDF officiel détenu, asset officiel de jeu fourni par le propriétaire, asset Modiphius ou Bethesda explicitement approuvé. Sont refusés sans exception implicite : génération d’image, fan art, récupération Web et autorisation incertaine.

Pour un PDF, consigner édition, page, fichier d’extraction et limites du recadrage. Pour un asset de jeu, consigner jeu/version, chemin ou archive d’origine et déclaration de fourniture par le propriétaire. Pour Modiphius/Bethesda, joindre l’autorisation explicite ou sa référence durable. Tant que ces éléments manquent, garder `review_state` à `pending-owner` ou `blocked`; ne jamais transformer une simple ressemblance en autorisation.

## Partage, validation et revue

Un `sharing_group` commençant par `proposal-` n’est qu’une suggestion. Il peut réunir des noms canoniques identiques, une dépendance et son consommable, ou un magazine et son aptitude associée. Le propriétaire doit approuver ou rejeter chaque groupe; aucune image ne peut être partagée sur cette seule proposition.

La revue suit cet ordre : vérifier la licence et la provenance; vérifier que l’image représente toutes les entrées du groupe; contrôler l’absence de texte localisé problématique; choisir un cadrage carré; vérifier lisibilité et contraste; confirmer la décision EN/FR unique. La future intégration produira du WebP carré, visera 150 Kio et ne dépassera 300 Kio que par exception documentée.

États : `pending-owner` attend une décision; `approved` signifie source, provenance, cadrage et partage approuvés; `rejected` conserve la piste refusée avec son motif; `blocked` signifie qu’aucune source autorisée exploitable n’est disponible.

## Commandes

```text
npm run artwork:inventory
npm run artwork:inventory:check
node --test test/artwork-inventory.test.mjs
```

La première commande met à jour les trois sorties en préservant les champs éditoriaux. La seconde est strictement en lecture et échoue si l’inventaire n’a pas exactement 544 identités uniques, si une paire/UUID/champ/source est invalide, ou si une sortie n’est pas déterministe.
