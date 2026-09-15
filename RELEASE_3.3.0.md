# Release Holophone 3.3.0

- `versionName`: **3.3.0**
- `versionCode`: **51**
- schéma structuré : **3200**

## Procédure

1. Fermer Android Studio.
2. Appliquer `APPLIQUER_PATCH_3.3.0.cmd`.
3. Lancer `RELEASE_3.3.0.cmd`.
4. Attendre la recette avant et après `npx cap sync android`.
5. Dans Android Studio : **Build → Generate Signed App Bundle or APK… → APK → release**.
6. Réutiliser le keystore existant. Ne pas en créer un nouveau.

## Vérifications téléphone

- lancement en Français après installation propre ;
- passage English dans `Réglages → Application → Langue` ;
- redémarrage : langue conservée ;
- import d'un pack JSON communautaire ;
- suppression d'un pack communautaire ;
- `À propos` suit la langue globale ;
- notifications anonymes ON/OFF ;
- aperçu multitâche en mode Auto avec PIN actif puis sans PIN ;
- modes Toujours masquer / Toujours afficher.
