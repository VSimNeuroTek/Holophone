# Release Holophone 2.9.0

## Objet

Version majeure d'interface ajoutant cinq palettes globales et un moteur de thèmes persistant.

## Prérequis

Installer ce patch **après Holophone 2.8.9**.

## Installation

1. Décompresser `Holophone_patch_2.9.0.zip`.
2. Fermer Android Studio.
3. Double-cliquer sur `APPLIQUER_PATCH_2.9.0.cmd`.
4. La cible par défaut est :
   `C:\Users\<utilisateur>\Desktop\Holophone`
5. Une sauvegarde des fichiers remplacés est créée dans :
   `_backup_patch_2.9.0`

## Version Android

Dans `android/app/build.gradle`, régler manuellement :

```gradle
versionCode 40
versionName "2.9.0"
```

## Préparation Android Studio

Lancer ensuite :

```text
02_PREPARER_ANDROID_STUDIO.cmd
```

Le script conserve le mécanisme 2.8.9 qui restaure le correctif des sons de notifications personnalisés avant `npx cap sync android`.

## APK signé

Dans Android Studio :

1. `Build > Generate Signed App Bundle or APK...`
2. `APK`
3. utiliser le keystore existant `signing\lumen-release.jks`
4. variante `release`
5. installer l'APK au-dessus de la version précédente pour conserver les données.

## Recette prioritaire

### 1. Migration 2.8.9

- installer 2.9.0 au-dessus de 2.8.9 ;
- vérifier que l'application démarre avec **Holophone Original** ;
- vérifier qu'aucun réglage existant n'est perdu.

### 2. Wallace Gold

- ouvrir `Réglages > Application > Apparence` ;
- toucher `Wallace Gold` ;
- vérifier l'aperçu immédiat ;
- contrôler accueil, réglages, conversation et clavier ;
- vérifier qu'aucun bouton d'accueil ne conserve jaune / cyan / rouge séparément.

### 3. Red & Blue Neon

- vérifier que le bleu reste l'accent fonctionnel commun ;
- vérifier que le rouge apparaît seulement comme halo / relief structurel commun ;
- aucun bouton particulier ne doit être codé rouge parce qu'il correspond à une fonction précise.

### 4. Blue-Green Neon

- vérifier accueil, conversation, interactions, Braindance, Refuge et clavier ;
- vérifier que la palette reste cyan / turquoise sans retour de magenta, jaune ou rouge fonctionnel.

### 5. Full Neon Red

- vérifier que toute l'interface colorée passe en rouge néon ;
- vérifier que textes neutres et médias restent lisibles.

### 6. Médias

Pour chaque nouveau thème :

- ouvrir un avatar ;
- afficher une image de galerie ;
- afficher une pochette Spotify ;
- vérifier que le contenu du média conserve ses couleurs originales.

### 7. Aperçu / annulation

- enregistrer `Original` ;
- prévisualiser `Wallace Gold` sans enregistrer ;
- utiliser la croix : le thème Original doit revenir ;
- recommencer et utiliser Retour Android : même résultat.

### 8. Persistance

- choisir un nouveau thème ;
- appuyer sur `Enregistrer` ;
- fermer complètement Holophone ;
- relancer ;
- vérifier que le thème choisi est restauré avant l'affichage de l'écran métier.

### 9. Régressions 2.8.9

- tester une notification anonymisée ;
- tester un MP3 de notification ;
- tester la bibliothèque audio ;
- tester le splash et son MP3 ;
- vérifier que ces fonctions ne sont pas affectées par le thème.
