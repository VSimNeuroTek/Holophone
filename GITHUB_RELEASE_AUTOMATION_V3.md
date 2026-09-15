# Holophone - GitHub Release Automation v3

Cette version corrige deux problemes rencontres pendant le premier test reel.

## Corrections v3

1. `signing/README.txt` est maintenant autorise, au meme titre que `signing/README.md`.
2. La verification de l'existence d'une release n'utilise plus `gh release view` sur une release inexistante.
   Le script utilise maintenant `gh release list`, ce qui evite l'erreur PowerShell `release not found`.
3. Si la branche locale est en retard sur GitHub, le script tente automatiquement :
   `git pull --rebase --autostash origin main`
   au lieu de demander une manipulation manuelle.

## Installation

Remplacer simplement :

`C:\Users\mudva\Desktop\Holophone\scripts\publish-github-release.ps1`

par la version contenue dans ce ZIP.

Le fichier `PUBLISH_GITHUB_RELEASE.cmd` est fourni egalement, mais son contenu reste compatible avec les versions precedentes.

## Test

Pour la version 3.2.2 :

`PUBLISH_GITHUB_RELEASE.cmd`

puis saisir :

`3.2.2`

Le script doit maintenant passer la verification `[1/8]` sans generer `release not found`.
