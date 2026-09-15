# Release Holophone 3.1.1

## Version

- `versionName "3.1.1"`
- `versionCode 43`
- schéma données : `3100`

## Procédure recommandée

1. Fermer Android Studio.
2. Appliquer `APPLIQUER_PATCH_3.1.1.cmd`.
3. Lancer `RELEASE_3.1.1.cmd`.
4. Laisser la recette et `cap sync android` se terminer.
5. Dans Android Studio : `Build > Generate Signed App Bundle or APK > APK > release`.
6. Réutiliser le keystore Holophone existant.

Le workflow sécurisé met à jour `android/app/build.gradle` en UTF-8 sans BOM et restaure sa sauvegarde si la préparation échoue.

## Recette appareil conseillée

- démarrage avec PIN : aucun écran métier avant le splash ;
- démarrage avec biométrie : même comportement ;
- vérifier le style de splash sélectionné et le MP3 sélectionné ;
- vérifier `À propos` : Holophone™, VSim NeuroTek (VSNT), Connecting Mind & Bytes. ;
- lancer `Santé Holophone` puis `Recette technique`.
