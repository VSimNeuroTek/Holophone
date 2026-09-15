# Patch Holophone 3.0.0 — Lot 1 Stabilisation technique

Cette archive transforme la branche 2.9.x en **socle 3.0.0**.

Elle inclut aussi les fichiers complets de l'interface 2.9.0 corrigée MP3. Si ton projet de bureau est encore en **2.8.9**, tu peux donc appliquer directement ce patch : les thèmes 2.9.0 et le correctif d'import MP3 sont inclus.

## Objectif

Le Lot 1 ne fait pas évoluer volontairement Judy.

Il sécurise :

- architecture ;
- migrations ;
- sauvegardes ;
- snapshots ;
- restauration ;
- diagnostic / Santé Holophone ;
- confidentialité Android ;
- recette de non-régression ;
- workflow de release.

## Installation

1. Fermer Android Studio.
2. Décompresser ce ZIP.
3. Double-cliquer sur :

```text
APPLIQUER_PATCH_3.0.0.cmd
```

La cible par défaut est :

```text
%USERPROFILE%\Desktop\Holophone
```

Le script crée :

```text
_backup_patch_3.0.0
```

avec les fichiers remplacés.

## Release recommandée

Après application du patch, ne modifie rien à la main pour la version Android : lance :

```text
RELEASE_3.0.0.cmd
```

Le nouveau workflow sûr prépare :

```gradle
versionCode 41
versionName "3.0.0"
```

puis synchronise Capacitor, exécute les contrôles et ouvre Android Studio.

Il reste ensuite uniquement à générer l'APK signé `release` avec le keystore existant.

## Recette seule

Tu peux lancer à tout moment :

```text
TESTER_STABLE_3.0.0.cmd
```

## Fallback manuel

Si tu préfères encore l'ancienne méthode :

```gradle
versionCode 41
versionName "3.0.0"
```

puis :

```text
02_PREPARER_ANDROID_STUDIO.cmd
```

## Santé dans l'application

Après installation :

```text
Réglages > Sous le capot > Santé Holophone 3.0
```

Tu y trouveras :

- Contrôler ;
- Réparation sûre ;
- Recette technique.

## Validation déjà réalisée

- JavaScript : OK ;
- recette statique : 25/25 ;
- `cap sync android` : OK ;
- cinq plugins Capacitor détectés.

La compilation Gradle complète n'a pas pu être exécutée dans l'environnement de création du patch parce que le wrapper Gradle doit télécharger `gradle-8.14.3-all.zip` et cet environnement n'a pas d'accès réseau.

La recette téléphone décrite dans `RECETTE_STABLE_3.0.0.md` reste donc nécessaire avant de geler définitivement la 3.0.0.

## Document de passation

Le patch installe également :

```text
HOLOPHONE_MASTER_HANDOFF_3.0.0.md
```

C'est désormais le document unique à transmettre à une nouvelle conversation avec les dernières sources.
