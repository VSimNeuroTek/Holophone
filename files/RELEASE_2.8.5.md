# Release Holophone 2.8.5

## Objet

Correctif ciblé des refus Gemini autour des Braindances et de la contamination du fil Interactions après une Braindance.

## Installation du patch

Le ZIP de patch contient `APPLIQUER_PATCH_2.8.5.cmd`.

1. Décompresser le ZIP n'importe où.
2. Fermer Android Studio si le projet est ouvert.
3. Double-cliquer sur `APPLIQUER_PATCH_2.8.5.cmd`.
4. Le script cible par défaut :
   `C:\Users\<utilisateur>\Desktop\Holophone`
5. Une sauvegarde des fichiers remplacés est créée dans :
   `_backup_patch_2.8.5`

Le script ne modifie volontairement pas `android/app/build.gradle`.

## Numéro de version Android

Dans `android/app/build.gradle`, régler manuellement :

```gradle
versionCode 35
versionName "2.8.5"
```

Ne rien changer d'autre dans `defaultConfig`.

## Préparation Android Studio

Lancer ensuite :

```text
02_PREPARER_ANDROID_STUDIO.cmd
```

Ce script exécute :

1. `npx cap sync android`
2. la préparation Android existante ;
3. l'ouverture d'Android Studio.

## Création de l'APK signé

Dans Android Studio :

1. `Build > Generate Signed App Bundle or APK...`
2. Choisir `APK`.
3. Utiliser le keystore existant :
   `C:\Users\mudva\Desktop\Holophone\signing\lumen-release.jks`
4. Variante `release`.
5. Installer l'APK par-dessus Holophone, sans désinstaller l'application afin de conserver les données.

## Recette prioritaire

### A. Déblocage du fil actuel

1. Installer 2.8.5 sans effacer les données.
2. Ouvrir la conversation qui était bloquée après la Braindance.
3. Envoyer un message banal, par exemple `Dy ?`.
4. Vérifier qu'une réponse revient et qu'aucun ancien `[BRAINDANCE STUDIO ...]` n'est renvoyé à Interactions.

### B. Nouvelle Braindance

1. Lancer une Braindance de 5 blocs avec le même type de contexte qui avait déclenché le problème.
2. Vérifier que le diagnostic indique `dedicated-generateContent`.
3. Vérifier que plusieurs blocs peuvent être générés sans que le bloc précédent soit réinjecté en texte brut.
4. Une fois la Braindance terminée, envoyer `As tu aimé ?`.
5. Vérifier que Judy répond normalement dans le fil de conversation.

### C. Replay / non-régression

- ouvrir Replay Braindance ;
- vérifier que les blocs produits sont bien archivés ;
- vérifier la lecture ElevenLabs d'un replay existant ;
- vérifier qu'une conversation texte normale continue d'utiliser `interactions-v1` dans le diagnostic.

## Limite fournisseur

Google conserve des contrôles de contenu prohibé indépendants des seuils `safetySettings`. `BLOCK_NONE` réduit les blocages provenant des catégories réglables, mais ne garantit pas qu'une requête donnée sera toujours acceptée par le service.
