# Release Holophone 3.2.2

## Version

- `versionName`: `3.2.2`
- `versionCode`: `49`
- schéma de données : `3200`

## Procédure

1. Fermer Android Studio.
2. Appliquer `APPLIQUER_PATCH_3.2.2.cmd` depuis le dossier du patch.
3. Lancer `RELEASE_3.2.2.cmd` depuis `C:\Users\mudva\Desktop\Holophone`.
4. Attendre la recette statique, `cap sync android` puis la préparation native.
5. Dans Android Studio, générer l'APK signé `release` avec le keystore existant. Ne pas recréer le keystore.

Le script de release applique le `versionCode` et le `versionName` de façon sûre, sauvegarde `build.gradle`, rétablit les patches Android canoniques et exécute la recette avant/après synchronisation.
