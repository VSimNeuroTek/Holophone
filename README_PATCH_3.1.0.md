# Holophone 3.1.0 — Lot 2 / Présence de Judy

Ce patch s'applique sur **Holophone 3.0.0**.

## Ce que cette version ajoute

- une présence persistante pour le personnage : énergie, envie de contact, curiosité, autonomie, activité/focus et motif possible d'initiative ;
- un écran `Réglages > Personnage > Vie de <prénom>` ;
- une petite chronologie locale des humeurs, activités, interactions, médias, refuge et initiatives ;
- des initiatives plus motivées par l'état actuel, sans forcer Judy à écrire ni inventer des événements importants ;
- schéma de données **3100** avec migration idempotente ;
- correction des faux positifs Santé vus dans le diagnostic 3.0.0.

## Important

`Envie de contact` n'est pas une jauge d'amour ou de relation. Elle décrit seulement une impulsion momentanée. `Autonomie` est volontairement présente pour éviter de recentrer constamment Judy sur l'utilisateur.

L'écran Vie de Judy montre des états calculés par Holophone et des événements persistés. Il n'expose pas le raisonnement privé du modèle.

## Installation

1. Fermer Android Studio.
2. Lancer `APPLIQUER_PATCH_3.1.0.cmd`.
3. Lancer `RELEASE_3.1.0.cmd`.
4. Dans Android Studio, générer l'APK signé `release` avec le keystore existant.

Le workflow règle automatiquement :

- `versionName "3.1.0"`
- `versionCode 42`

## Validation

La recette statique de référence passe **31 / 31 contrôles**, y compris après `cap sync android`.

Le build Gradle complet n'a pas pu être exécuté dans l'environnement de génération car le wrapper ne peut pas joindre `services.gradle.org`. La compilation Android finale doit donc être confirmée sur le poste de développement habituel.
