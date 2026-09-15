# Release Holophone 2.8.8

## Objet

Cette version rend le démarrage personnalisable : choix de splash, import d'un MP3 et synchronisation de la durée du splash avec le jingle.

Elle ajoute aussi l'affichage permanent de la version dans le bandeau CPU/RAM.

## Prérequis

Installer ce patch après **Holophone 2.8.7**.

## Installation

1. Décompresser le ZIP du patch.
2. Fermer Android Studio.
3. Double-cliquer sur :

```text
APPLIQUER_PATCH_2.8.8.cmd
```

Le chemin cible par défaut est :

```text
C:\Users\<utilisateur>\Desktop\Holophone
```

Une sauvegarde des fichiers remplacés est créée dans :

```text
_backup_patch_2.8.8
```

## Version Android

Dans `android/app/build.gradle`, régler manuellement :

```gradle
versionCode 38
versionName "2.8.8"
```

Le patch ne modifie pas automatiquement ce fichier.

## Préparation Android Studio

Lancer :

```text
02_PREPARER_ANDROID_STUDIO.cmd
```

Le script effectue :

1. `npx cap sync android`
2. la préparation Android existante
3. l'ouverture du projet dans Android Studio

## Génération de l'APK

Dans Android Studio :

1. `Build > Generate Signed App Bundle or APK...`
2. sélectionner `APK`
3. utiliser le keystore existant `signing\lumen-release.jks`
4. choisir la variante `release`
5. installer l'APK par-dessus la version existante pour conserver les données.

## Recette prioritaire

### Bandeau supérieur

- vérifier `Holophone v2.8.8` en haut à gauche ;
- vérifier CPU et RAM à droite ;
- tester sur un écran de 360 px de large.

### Choix des styles

Dans `Réglages → Application → Démarrage` :

- sélectionner Classique 2.8.7 ;
- lancer le test ;
- répéter avec Wallace / Joi ;
- répéter avec Minimaliste ;
- répéter avec Cyberpunk ;
- fermer complètement l'application et vérifier que le dernier choix est conservé.

### MP3 personnalisé

- importer un MP3 court ;
- vérifier son nom et sa durée dans l'écran ;
- lancer le test ;
- vérifier que le splash disparaît à la fin réelle du fichier ;
- fermer puis relancer Holophone ;
- vérifier que le MP3 personnalisé est toujours utilisé.

### Restauration

- toucher `Jingle d'origine` ;
- vérifier le retour à `joi_startup.mp3` ;
- relancer l'application.

### Verrouillage

- activer le PIN ;
- fermer complètement l'application ;
- relancer ;
- vérifier que le PIN apparaît avant le splash ;
- déverrouiller ;
- vérifier que le splash sélectionné est ensuite joué.
