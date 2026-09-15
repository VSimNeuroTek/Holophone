# Changements Holophone 3.0.0

## Objet

Holophone 3.0.0 constitue le **Lot 1 — Stabilisation technique**.

Cette version ne cherche pas à faire évoluer volontairement la personnalité ou le comportement de Judy. Le but est de transformer la branche 2.9.0 en socle plus sûr, testable et maintenable avant d'attaquer le Lot 2 consacré à Judy.

## 1. Nouvelle couche de stabilité

Ajout de :

```text
www/js/holophone-stability.js
```

Cette couche est chargée avant `holophone-v2.js` et orchestre le démarrage sans déplacer le moteur conversationnel historique.

Elle fournit :

- schéma de données versionné ;
- migrations idempotentes ;
- journal de migration ;
- contrôles d'intégrité ;
- page Santé Holophone ;
- réparation sûre ;
- recette runtime ;
- validation et décoration des sauvegardes ;
- rollback mémoire d'une restauration échouée.

Le schéma 3.0.0 porte le numéro :

```text
3000
```

## 2. Migration 2.9.x -> 3.0.0

La migration de base normalise sans supprimer de données :

- droits d'utilisation des Interactions ;
- thème UI ;
- configuration du splash ;
- bibliothèque audio.

Une attention particulière conserve la migration historique du MP3 personnalisé 2.8.8 : un ancien `source=custom` sans `audioId` n'est pas écrasé avant que le moteur audio ait pu le rapatrier dans la bibliothèque commune.

## 3. Santé Holophone

`Réglages > Sous le capot` contient désormais une section **Santé Holophone 3.0**.

Les contrôles portent notamment sur :

- schéma de données ;
- localStorage ;
- IndexedDB ;
- écriture dans Documents/Holophone ;
- cohérence personnage/conversations ;
- thème et clavier ;
- droits des Interactions ;
- bibliothèque MP3 ;
- médias référencés / orphelins / manquants ;
- snapshots ;
- permission notifications ;
- SecureStore Android ;
- télémétrie CPU/RAM ;
- présence de traces Braindance legacy.

Trois actions sont disponibles :

- `Contrôler` ;
- `Réparation sûre` ;
- `Recette technique`.

La réparation sûre ne supprime ni conversation ni média référencé.

## 4. Sauvegardes complètes v12

Le format de sauvegarde complète passe à :

```text
v: 12
schemaVersion: 3000
```

Chaque nouvelle sauvegarde reçoit aussi :

- la version Holophone ;
- les compteurs principaux ;
- un SHA-256 du contenu logique lorsque `crypto.subtle` est disponible.

À l'import :

- un schéma futur est refusé ;
- une conversation pointant vers un contact absent est refusée ;
- un SHA-256 présent mais invalide bloque la restauration.

## 5. Restauration transactionnelle

Avant de restaurer une sauvegarde complète, Holophone capture l'état runtime courant.

Si l'import échoue en cours de route :

- les objets en mémoire sont restaurés ;
- les réglages précédents sont réécrits ;
- le thème et la bibliothèque audio sont réhydratés ;
- les nouveaux médias éventuellement écrits mais devenus inutiles restent simplement orphelins et peuvent être supprimés par l'outil de maintenance existant.

Cela réduit fortement le risque d'une restauration partielle.

## 6. Snapshots automatiques v3

Les snapshots automatiques passent de v2 à v3.

Ils contiennent désormais, sans secrets :

- contacts ;
- conversations ;
- initiative ;
- génération ;
- utilisateur ;
- thème ;
- Interactions ;
- Braindance ;
- splash ;
- métadonnées de bibliothèque audio ;
- configuration V2 ;
- paramètres API non secrets ;
- paramètres voix/recherche sans clé ;
- paramètres Spotify sans jetons.

La restauration d'un snapshot futur (`schemaVersion > 3000`) est refusée.

## 7. Vie privée Android

La sauvegarde système Android est désormais explicitement désactivée :

```xml
android:allowBackup="false"
```

Holophone possède déjà son mécanisme explicite de sauvegarde. Cette modification évite qu'Android duplique silencieusement les données applicatives dans son mécanisme de backup système.

Le réglage est réimposé par :

- `AndroidManifest.xml` courant ;
- `scripts/configure-android.ps1` ;
- `scripts/prepare-android-v20.ps1`.

`FLAG_SECURE`, le masquage de la barre de navigation et SecureStore restent inchangés.

## 8. PIN / biométrie / splash

Un cas de cohérence a été corrigé : le déverrouillage biométrique déclenche désormais le splash exactement comme la saisie correcte du PIN.

Aucun écran métier n'est affiché avant le verrouillage lorsque celui-ci est actif.

## 9. Fin du risque BOM PowerShell 5.1

`scripts/configure-android.ps1` n'utilise plus :

```powershell
Set-Content -Encoding UTF8
```

pour modifier les fichiers Gradle.

Les écritures critiques utilisent désormais `System.Text.UTF8Encoding($false)` afin de produire de l'UTF-8 sans BOM sous Windows PowerShell 5.1.

## 10. Release sûre

Nouveaux outils :

```text
RELEASE.cmd
RELEASE_3.0.0.cmd
scripts/release-safe.ps1
```

Le processus :

1. vérifie `APPV` et la version V2 ;
2. exécute la recette statique ;
3. sauvegarde `android/app/build.gradle` ;
4. vérifie qu'il existe exactement un `versionCode` et un `versionName` ;
5. remplace les lignes par position, sans remplacement `$1` ambigu ;
6. écrit sans BOM ;
7. restaure le correctif `SoundResolver.kt` ;
8. exécute `cap sync android` ;
9. applique la préparation Android ;
10. réexécute la recette ;
11. ouvre Android Studio ;
12. restaure `build.gradle` si une étape échoue.

Cela remplace le vieux mécanisme fragile qui avait produit `$133`.

## 11. Recette automatique

Nouveaux outils :

```text
TESTER_STABLE_3.0.0.cmd
scripts/test-stable-v300.js
```

La recette statique contrôle notamment :

- versions ;
- ordre de chargement ;
- migrations ;
- checksum des sauvegardes ;
- rollback restauration ;
- snapshots ;
- import MP3 multi-fichiers ;
- notifications anonymisées ;
- sons Android privés ;
- `FLAG_SECURE` ;
- `allowBackup=false` ;
- BiometricPrompt ;
- `onResume public` ;
- isolation Braindance ;
- droits Interactions ;
- cinq thèmes ;
- PIN/splash ;
- splash après biométrie ;
- persistance du patch notification ;
- absence de BOM ;
- absence du remplacement dangereux `$1/$133` ;
- syntaxe JavaScript.

## 12. Comportement de Judy

Aucune modification volontaire de la personnalité, de l'humeur, de l'initiative, de la mémoire longue ou du style de réponse n'est introduite par ce lot.

Toute variation notable du comportement de Judy après mise à jour doit donc être traitée comme une régression à analyser.
