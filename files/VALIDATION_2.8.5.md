# Validation Holophone 2.8.5

## Contrôles statiques effectués

- `www/index.html` : syntaxe JavaScript du script principal vérifiée avec Node.
- `www/js/holophone-v2.js` : `node --check` OK.
- version interface : `APPV = 2.8.5`.
- version module V2 : `2.8.5`.
- moteur Braindance : `generateContent-v1beta`.
- réflexion Braindance : `thinkingLevel = HIGH`.
- catégories de sécurité réglables Braindance : `BLOCK_NONE`.
- absence d'ajout futur de `[BRAINDANCE STUDIO ...]` dans `conv.ai`.
- absence d'ajout futur des blocs Braindance bruts dans `conv.ai`.
- marquage des messages affichés Braindance avec `bd:true`.
- pont de continuité post-Braindance neutre présent.
- filtre de compatibilité pour les anciennes entrées `[BRAINDANCE STUDIO ...]` / `[BRAINDANCE bloc ...]` présent.
- bootstrap Interactions exclut les blocs Braindance.
- mémoire épisodique et rappels croisés excluent les blocs Braindance.

## Contrôle à faire sur téléphone

La validation finale nécessite la clé Gemini réelle et les données locales du téléphone. Les appels réseau Gemini ne sont donc pas exécutés dans la validation statique du patch.

## Synchronisation Capacitor

Validation effectuée sur la source patchée :

- copie de `www` vers `android/app/src/main/assets/public` : OK ;
- détection des 5 plugins Capacitor Android : OK ;
- mise à jour des plugins Android : OK ;
- assets Android synchronisés avec `APPV = 2.8.5` et module V2 `2.8.5`.

## Build Gradle dans l'environnement de validation

Le lancement de `assembleDebug` a été tenté mais le Gradle Wrapper devait télécharger `gradle-8.14.3-all.zip`. L'environnement de validation n'a pas accès à `services.gradle.org`, donc le build complet n'a pas pu être exécuté ici. La synchro Capacitor et les contrôles de syntaxe sont passés avant cette étape.
