# Release Holophone 3.2.1

## Version Android

```text
versionName 3.2.1
versionCode 48
schemaVersion 3200
```

## Patch cumulatif

`APPLIQUER_PATCH_3.2.1.cmd` accepte Holophone **3.1.4**, **3.2.0** ou **3.2.1**. Il contient les évolutions 3.2.0 ainsi que la nouvelle page À propos VSNT.

## Procédure

1. Fermer Android Studio.
2. Lancer `APPLIQUER_PATCH_3.2.1.cmd`.
3. Lancer `RELEASE_3.2.1.cmd`.
4. Laisser la recette, la mise à jour de version Android, `cap sync android` et la préparation native se terminer.
5. Dans Android Studio : **Build > Generate Signed App Bundle or APK > APK > release**.
6. Réutiliser le keystore existant.

Ne pas modifier `android/app/build.gradle` à la main.

## Vérification appareil

Après installation :

- ouvrir `Réglages > Application > À propos` ;
- vérifier le logo VSNT orange/noir ;
- vérifier le héros `Holophone™ · Adaptive Persona Interface` ;
- vérifier les six modules Core systems ;
- vérifier que version et état local sont affichés ;
- vérifier que la page suit le thème actif sans recolorer le logo VSNT ;
- contrôler ensuite `Persona > Vie de <prénom>` pour confirmer la continuité 3.2.0.

## Retour arrière

L'appliqueur crée `_backup_patch_3.2.1` et restaure automatiquement les fichiers déjà écrits si une erreur survient pendant l'installation.
