# Release Holophone 2.8.9

## Objet

Notifications anonymisées et bibliothèque MP3 commune au splash et aux notifications.

## Prérequis

Installer ce patch après **Holophone 2.8.8**.

## Installation

1. Décompresser `Holophone_patch_2.8.9.zip`.
2. Fermer Android Studio.
3. Double-cliquer sur `APPLIQUER_PATCH_2.8.9.cmd`.
4. Le chemin cible par défaut est :
   `C:\Users\<utilisateur>\Desktop\Holophone`
5. Une sauvegarde des fichiers remplacés est créée dans :
   `_backup_patch_2.8.9`

## Version Android

Dans `android/app/build.gradle`, régler manuellement :

```gradle
versionCode 39
versionName "2.8.9"
```

## Préparation Android Studio

Lancer ensuite :

```text
02_PREPARER_ANDROID_STUDIO.cmd
```

Le script :

1. restaure le correctif de résolution des sons de notification dans le plugin Capacitor ;
2. exécute `npx cap sync android` ;
3. prépare Android ;
4. ouvre Android Studio.

## APK signé

Dans Android Studio :

1. `Build > Generate Signed App Bundle or APK...`
2. `APK`
3. utiliser le keystore existant `signing\lumen-release.jks`
4. variante `release`
5. installer l'APK par-dessus la version existante pour conserver les données.

## Recette prioritaire

### 1. Notification anonyme

- laisser Judy produire une initiative ;
- mettre l'application en arrière-plan ;
- vérifier qu'Android affiche uniquement :
  - `Holophone`
  - `1 nouveau message` ou `X nouveaux messages`
- vérifier qu'aucun prénom ni extrait du texte n'est visible.

### 2. Migration du MP3 2.8.8

Si un MP3 personnalisé était déjà configuré en 2.8.8 :

- ouvrir `Réglages > Application > Démarrage & sons` ;
- vérifier qu'il apparaît dans la bibliothèque ;
- vérifier qu'il est toujours sélectionné pour le splash.

### 3. Plusieurs MP3

- importer au moins deux MP3 ;
- vérifier que les deux restent dans la bibliothèque ;
- sélectionner le premier pour le splash ;
- sélectionner le second pour les notifications ;
- fermer et rouvrir Holophone ;
- vérifier que les deux choix sont conservés.

### 4. Test du splash

- utiliser `Tester le splash` ;
- vérifier que le splash reste visible exactement jusqu'à la fin du MP3 choisi.

### 5. Test de notification

- sélectionner un MP3 de notification ;
- toucher `Tester la notification` ;
- vérifier le texte anonyme ;
- vérifier que le morceau choisi est bien joué.

### 6. Son intégré

- sélectionner `joi_startup.mp3` comme son de notification ;
- tester la notification ;
- vérifier que le son intégré fonctionne également.

### 7. Son système

- sélectionner `Son système Android` ;
- tester une notification ;
- vérifier le retour au son de notification habituel du téléphone.

### 8. Sauvegarde / restauration

- exporter une sauvegarde avec médias ;
- restaurer cette sauvegarde ;
- vérifier que les MP3 de la bibliothèque et les deux sélections sont restaurés.
