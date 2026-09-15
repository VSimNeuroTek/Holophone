# Publication GitHub automatique de Holophone

Ce package ajoute une commande simple pour publier les prochaines versions de Holophone sur GitHub.

## Fichiers

- `PUBLISH_GITHUB_RELEASE.cmd`
- `scripts\publish-github-release.ps1`

## Installation

Copier `PUBLISH_GITHUB_RELEASE.cmd` a la racine de `C:\Users\mudva\Desktop\Holophone` et `publish-github-release.ps1` dans `C:\Users\mudva\Desktop\Holophone\scripts`.

## Prerequis

Verifier :

```text
git --version
gh --version
gh auth status
```

Le compte GitHub attendu est `VSimNeuroTek`.

## Utilisation

Quand une nouvelle version est preparee et que l'APK existe dans `android\app\release`, double-cliquer sur `PUBLISH_GITHUB_RELEASE.cmd` puis saisir la version, par exemple `3.2.2`.

On peut aussi lancer :

```bat
PUBLISH_GITHUB_RELEASE.cmd 3.2.2
```

## Controles effectues

Le script verifie Git, GitHub CLI, l'authentification, la branche `main`, l'etat distant, l'absence de tag/release deja existants, les fichiers sensibles suivis par Git, une detection rapide de cles Google de type `AIza...`, l'existence de l'APK et le fait qu'il soit ignore par `.gitignore`.

## Publication

Apres confirmation, il effectue le commit des sources, le push de `main`, la creation et le push du tag `vX.Y.Z`, la creation de la GitHub Release, l'upload de l'APK et le marquage comme `Latest`.

## Notes de release

Le script utilise en priorite `CHANGEMENTS_X.Y.Z.md`, puis `RELEASE_X.Y.Z.md`. S'il n'en trouve aucun, il genere des notes minimales.

## Noms APK reconnus

```text
Holophone3.2.2.apk
Holophone.3.2.2.apk
Holophone-3.2.2.apk
Holophone_3.2.2.apk
```

L'asset GitHub est normalise en `Holophone.X.Y.Z.apk`.

## Securite

Ne jamais publier une cle de signature Android, un `.jks`, un `.keystore`, `local.properties`, `signing-config.json`, ni des cles API Gemini/ElevenLabs.

## Correctif v2

Le controle du dossier `signing` autorise maintenant les fichiers documentaires :

```text
signing/README.md
signing/README.txt
```

Tout autre fichier suivi dans `signing` continue de bloquer la publication.

