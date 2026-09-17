# Release Holophone 3.4.0

- versionName : `3.4.0`
- versionCode : `54`
- schemaVersion : `3200`

## Procédure
1. Fermer Android Studio.
2. Lancer `APPLIQUER_PATCH_3.4.0.cmd`.
3. Lancer `RELEASE_3.4.0.cmd`.
4. Dans Android Studio : `Build > Generate Signed App Bundle or APK > APK > release`.
5. Utiliser le keystore existant.

Le premier démarrage 3.4.0 réinitialise uniquement les IDs Gemini Interaction pour décontaminer le contexte serveur. Les conversations et mémoires visibles sont conservées.
