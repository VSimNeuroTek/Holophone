# Release Holophone 3.2.3

- `versionName`: `3.2.3`
- `versionCode`: `50`
- `schemaVersion`: `3200`

## Procédure

1. Fermer Android Studio.
2. Appliquer `APPLIQUER_PATCH_3.2.3.cmd` depuis le dossier du patch.
3. Lancer `RELEASE_3.2.3.cmd` depuis `C:\Users\mudva\Desktop\Holophone`.
4. Dans Android Studio, générer l'APK `release` signé avec le keystore existant. Ne pas recréer le keystore.

Le workflow sécurisé vérifie APPV/V2/stabilité, exécute la recette, met à jour `build.gradle` en UTF-8 sans BOM, fait `cap sync android`, rétablit les patches Android canoniques puis relance la recette.
