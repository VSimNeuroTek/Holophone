# Release Holophone 2.8.6

## Objet

Évolution ergonomique et fonctionnelle du système d'Interactions.

## Prérequis

Installer ce patch **après Holophone 2.8.5**.

## Installation

Le ZIP contient `APPLIQUER_PATCH_2.8.6.cmd`.

1. Décompresser le ZIP.
2. Fermer Android Studio.
3. Double-cliquer sur `APPLIQUER_PATCH_2.8.6.cmd`.
4. Le chemin cible par défaut est :
   `C:\Users\<utilisateur>\Desktop\Holophone`
5. Une sauvegarde est créée dans :
   `_backup_patch_2.8.6`

Le script ne modifie pas automatiquement le Gradle Android.

## Version Android

Dans `android/app/build.gradle`, régler uniquement :

```gradle
versionCode 36
versionName "2.8.6"
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

### 1. Migration

- ouvrir une installation ayant déjà des interactions 2.8.5 ;
- vérifier que chaque interaction affiche **Les deux** par défaut ;
- vérifier qu'aucune interaction personnalisée n'a disparu.

### 2. Portée utilisateur

Configurer une interaction en **Toi** :

- elle doit apparaître dans ton sélecteur ;
- elle ne doit pas pouvoir être émise spontanément par le personnage.

### 3. Portée personnage

Configurer une interaction en **[prénom du personnage]** :

- elle ne doit pas apparaître dans ton sélecteur ;
- elle doit rester disponible pour une initiative ou une réponse physique du personnage.

### 4. Les deux

Configurer une interaction en **Les deux** :

- elle doit être disponible des deux côtés.

### 5. Prénom dynamique

Avec un contact dont le prénom n'est pas Judy :

- ouvrir la modification d'une interaction ;
- vérifier que l'option porte le prénom de ce contact ;
- vérifier le même prénom dans les explications de l'écran.

### 6. Recherche

- rechercher un mot du libellé ;
- rechercher un mot de la formulation ;
- rechercher une humeur ;
- vérifier que les accents et majuscules n'empêchent pas le résultat.

### 7. Pliage global

Dans le sélecteur rapide puis dans le paramétrage :

- `Tout plier` ferme toutes les catégories visibles ;
- `Tout déplier` les ouvre ;
- une recherche ouvre automatiquement les catégories correspondantes.
