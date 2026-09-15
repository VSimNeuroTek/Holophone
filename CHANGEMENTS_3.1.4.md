# Holophone 3.1.4 — Persona & plein écran immersif

## Objectif

Ce lot est volontairement ciblé : rendre l'application indépendante de tout prénom de personnage codé en dur, renommer la catégorie de réglages **Persona**, et utiliser toute la surface physique Android, y compris la zone de la barre de statut.

## Persona dynamique

Le code de production n'emploie plus de prénom historique pour désigner le personnage. Le nom affiché provient de la fiche active via `characterName(c)` / `characterFullName(c)`.

Les rôles internes de conversation sont désormais neutres :

```text
v
character
sys
evt
refuge
```

Le schéma passe à **3140** avec la migration idempotente `persona-neutral-3.1.4`. Elle convertit les anciens rôles, propriétaires de souvenirs/propositions et certains états Refuge sans supprimer de conversation, média, goût ou souvenir.

Les anciennes clés SecureStore/localStorage et l'ancien nom IndexedDB restent lisibles uniquement via une migration de compatibilité construite dynamiquement ; ils ne sont plus utilisés comme noms courants.

Les anciennes sauvegardes complètes et fiches restent importables grâce aux identifiants historiques reconstruits en mémoire, sans réintroduire de prénom dans le code source.

## Réglages

La catégorie **Personnage** devient **Persona**.

Les écrans et libellés qui parlent directement du personnage utilisent son prénom configuré lorsqu'il existe, avec `Persona` comme fallback neutre.

## Android immersif

`MainActivity` utilise AndroidX WindowCompat / WindowInsets afin de masquer **status bar + navigation bar** et d'étendre Holophone jusqu'aux bords physiques de l'écran.

Le mode est réappliqué :

- à `onCreate` ;
- à `onResume` ;
- à `onPostResume` ;
- lors du retour de focus dans la fenêtre.

Les barres système sont configurées en mode transitoire par geste (`BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE`) : Android peut les révéler temporairement si l'utilisateur balaie depuis un bord, sans transformer Holophone en application kiosque.

Les écrans avec poinçon/notch utilisent `LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES` et le Web applique les `safe-area-inset-*` au contenu. Le cadre peut aller au bord de l'écran, tandis que les commandes restent protégées des découpes.

Le patch natif canonique est conservé dans :

```text
scripts/patches/android/MainActivity.java
```

et `prepare-android-v20.ps1` le restaure après chaque `cap sync android`.

## Version

```text
versionName 3.1.4
versionCode 46
schemaVersion 3140
```
