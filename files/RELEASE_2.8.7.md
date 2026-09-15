# Release Holophone 2.8.7

## Objet

Ajout d'un écran de démarrage animé **Holophone Industry** avec lecture du son de startup fourni par l'utilisateur.

## Prérequis

Installer ce patch **après Holophone 2.8.6**.

## Installation

Le ZIP contient `APPLIQUER_PATCH_2.8.7.cmd`.

1. Décompresser le ZIP.
2. Fermer Android Studio.
3. Double-cliquer sur `APPLIQUER_PATCH_2.8.7.cmd`.
4. Le chemin cible par défaut est :
   `C:\Users\<utilisateur>\Desktop\Holophone`
5. Une sauvegarde est créée dans :
   `_backup_patch_2.8.7`

Le script ne modifie pas automatiquement le Gradle Android.

## Version Android

Dans `android/app/build.gradle`, régler uniquement :

```gradle
versionCode 37
versionName "2.8.7"
```

## Préparation Android Studio

Lancer :

```text
02_PREPARER_ANDROID_STUDIO.cmd
```

Le script effectue la synchronisation Capacitor puis ouvre Android Studio.

## APK signé

Dans Android Studio :

1. `Build > Generate Signed App Bundle or APK...`
2. `APK`
3. utiliser le keystore existant `signing\lumen-release.jks`
4. variante `release`
5. installer l'APK par-dessus la version existante pour conserver les données.

## Recette prioritaire

### 1. Lancement à froid sans PIN

- fermer complètement Holophone ;
- relancer l'application ;
- vérifier l'apparition du splash **Holophone Industry** ;
- vérifier la lecture du jingle de startup ;
- vérifier la transition automatique vers l'écran habituel.

### 2. Lancement à froid avec PIN actif

- activer le code ;
- fermer complètement Holophone ;
- relancer ;
- vérifier que seul l'écran de code apparaît ;
- saisir le bon code ;
- vérifier qu'ensuite le splash de démarrage se joue ;
- vérifier qu'aucun écran métier n'est visible avant la saisie du code.

### 3. Tolérance si l'audio échoue

- si, selon l'appareil, la lecture automatique échoue,
  vérifier que l'animation s'affiche quand même ;
- vérifier que l'application continue vers l'accueil sans blocage.

### 4. Régression générale

- vérifier que l'écran d'accueil s'ouvre normalement ;
- vérifier que la conversation, les réglages et les interactions fonctionnent comme avant ;
- vérifier que `npx cap sync android` copie bien `www/media/joi_startup.mp3` dans les assets Android.
