# Release Holophone 3.0.0 — Lot 1 Stabilisation

## Version Android

```gradle
versionCode 41
versionName "3.0.0"
```

## Méthode recommandée

Après application du patch :

```text
RELEASE_3.0.0.cmd
```

Ce script appelle le workflow sécurisé 3.0.0, synchronise Android et ouvre Android Studio.

Il n'écrit jamais un remplacement ambigu de type `$1...` dans `build.gradle`.

## Méthode générique

Le nouveau point d'entrée accepte aussi explicitement une version et un code :

```text
RELEASE.cmd 3.0.0 41
```

Pour les futures versions, le code source Web devra déjà porter exactement la même version, sinon le script refuse de continuer.

## Signature

Dans Android Studio :

1. `Build > Generate Signed App Bundle or APK...`
2. `APK`
3. variante `release`
4. utiliser le keystore existant `signing\lumen-release.jks`
5. installer l'APK par-dessus la version précédente.

Ne jamais recréer le keystore.

## Recette avant signature

Lancer au besoin :

```text
TESTER_STABLE_3.0.0.cmd
```

Puis, sur téléphone, vérifier au minimum :

- démarrage sans PIN ;
- démarrage avec PIN ;
- biométrie si activée ;
- splash + fin réelle du MP3 ;
- import de plusieurs MP3 ;
- notification anonymisée avec MP3 personnalisé ;
- 5 thèmes ;
- conversation existante ;
- envoi texte ;
- image ;
- Interactions ;
- Braindance ;
- Replay ;
- Refuge ;
- sauvegarde complète ;
- restauration d'une sauvegarde test ;
- `Sous le capot > Santé Holophone` sans erreur critique.

## Fallback manuel

Si le script de release n'est pas utilisé, régler manuellement :

```gradle
versionCode 41
versionName "3.0.0"
```

puis lancer :

```text
02_PREPARER_ANDROID_STUDIO.cmd
```
