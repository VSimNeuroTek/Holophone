# Holophone - GitHub Release Automation v4

Cette version corrige le plantage PowerShell :

`Impossible d'appeler une methode dans une expression Null.`

## Cause exacte

Quand un tag n'existe pas encore, la commande :

`git tag --list vX.Y.Z`

ne renvoie aucune ligne.

Dans les versions precedentes, le script faisait ensuite directement `.Trim()` sur cette sortie vide.
Sous Windows PowerShell 5.1, cela donne une valeur `$null`, puis le script plante.

C'est exactement le cas normal lors de la creation d'une nouvelle release.

## Correction

La v4 ne fait plus aucun `.Trim()` directement sur une sortie de commande native potentiellement vide.

Toutes les sorties Git/GitHub sont capturees sous forme de tableau, concatenees en chaine, puis validees.

La v4 conserve aussi :

- autorisation de `signing/README.txt` et `signing/README.md`;
- blocage des `.jks`, `.keystore`, `local.properties` et `signing-config.json`;
- detection de chaines ressemblant a une cle Google `AIza...`;
- synchronisation automatique `git pull --rebase --autostash` si la branche locale est en retard;
- controle des tags locaux et distants;
- controle de la release GitHub existante;
- recherche automatique de l'APK;
- creation du commit, push, tag et release.

## Installation

Remplacer :

`C:\Users\mudva\Desktop\Holophone\scripts\publish-github-release.ps1`

par celui contenu dans ce ZIP.

Le `.cmd` est fourni egalement mais n'a pas besoin d'etre remplace s'il est deja present.

## Test 3.2.2

Lancer :

`PUBLISH_GITHUB_RELEASE.cmd`

et saisir :

`3.2.2`

Le script doit atteindre au minimum l'etape `[2/8] Recherche de l'APK 3.2.2...`.

Aucune publication n'est effectuee avant la confirmation explicite :

`Publier Holophone 3.2.2 sur GitHub ? (O/N)`
