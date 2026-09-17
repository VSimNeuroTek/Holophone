# Test terrain Holophone 3.4.2 — sauvegarde globale

Ce test vise uniquement le crash mémoire observé en 3.4.1 au clic sur **Enregistrer la sauvegarde**.

## 1. Récupérer la branche de test

Dans un terminal ouvert dans le dossier `Holophone` :

```bat
git fetch origin
git switch fix/3.4.2-backup-memory
git pull --ff-only origin fix/3.4.2-backup-memory
```

Le test ne nécessite pas de fusionner la PR dans `main`.

## 2. Vérifier le patch

Double-cliquer sur :

```text
TESTER_3.4.2.cmd
```

La recette doit terminer avec `TEST 3.4.2 OK`.

## 3. Préparer Android Studio

Double-cliquer sur :

```text
RELEASE_3.4.2.cmd
```

Le script :

1. exécute la recette 3.4.2 ;
2. réutilise la préparation native stable de la 3.4.1 ;
3. exécute `cap sync android` ;
4. vérifie que `holophone-backup342.js` est réellement présent dans les assets Android ;
5. prépare `versionName 3.4.2` et `versionCode 56` ;
6. ouvre Android Studio.

## 4. Générer l'APK de test

Dans Android Studio :

`Build` → `Generate Signed App Bundle or APK...` → `APK` → `release`

**Utiliser exactement le même keystore/signature que la 3.4.1.**

Ne pas tester avec un APK `debug` sur le téléphone contenant les données actuelles : sa signature est normalement différente et Android refusera la mise à jour. Ne pas désinstaller Holophone pour contourner ce refus, car cela supprimerait les données locales.

## 5. Installer par-dessus la 3.4.1

Après génération de l'APK signé, depuis un CMD :

```bat
adb install -r "CHEMIN\VERS\app-release.apk"
```

La commande doit terminer par `Success`.

## 6. Test principal

Sur le téléphone :

1. ouvrir Holophone ;
2. vérifier rapidement que les conversations et médias sont toujours présents ;
3. ouvrir **Sauvegarde** ;
4. appuyer sur **Enregistrer la sauvegarde** ;
5. laisser l'opération aller jusqu'au message de réussite sans quitter l'application.

Résultat attendu :

- aucun crash Android ;
- un fichier `holophone-global-....holo` dans `Documents/Holophone/saves` ;
- l'interface affiche la taille et le nombre de médias ;
- les conversations restent utilisables après l'export.

## 7. Logcat pendant le premier essai

Pour le premier test seulement, il est utile de laisser tourner :

```bat
adb logcat -c
adb logcat -v threadtime > holophone_342_backup_test.txt
```

Lancer ensuite la sauvegarde. Quand elle se termine, revenir dans le CMD et faire `Ctrl+C`.

Si le test échoue ou si l'application se ferme, conserver `holophone_342_backup_test.txt`.

## 8. Restauration

Ne pas tester la restauration du nouveau `.holo` sur les données principales tant que l'export n'a pas été validé. La restauration v14 sera testée séparément après validation de l'absence d'OOM à l'export.

## Retour arrière Git

Pour revenir sur la branche principale sans toucher aux données Android :

```bat
git switch main
```

Ne pas supprimer les données de l'application et ne pas désinstaller Holophone pendant cette recette.
