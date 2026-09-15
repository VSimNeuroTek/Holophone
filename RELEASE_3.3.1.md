# Release Holophone 3.3.1

- `versionName`: **3.3.1**
- `versionCode`: **52**
- `schemaVersion`: **3200**

## Procédure

1. Fermer Android Studio.
2. Appliquer `APPLIQUER_PATCH_3.3.1.cmd`.
3. Lancer `RELEASE_3.3.1.cmd`.
4. Dans Android Studio : **Build → Generate Signed App Bundle or APK → APK → release**.
5. Réutiliser le keystore existant.

Le script de release exécute la recette statique avant et après `cap sync android`.
