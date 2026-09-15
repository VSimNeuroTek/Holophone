# Architecture de stabilité — Holophone 3.0.0

## Principe

Le cœur historique reste dans `www/index.html` pour éviter une réécriture risquée juste avant la branche stable.

La 3.0.0 commence le découpage par une couche technique indépendante :

```text
index.html
   |
   +--> holophone-stability.js
   |       schéma / migrations
   |       santé
   |       validation sauvegardes
   |       rollback restauration
   |       recette runtime
   |
   +--> holophone-v2.js
           mémoire / Interactions / snapshots / télémétrie
```

L'objectif est de poursuivre l'extraction progressivement dans les versions futures, sans déplacer le moteur conversationnel tant que la recette de non-régression n'est pas suffisamment large.

## Démarrage

Le HTML ne lance plus directement `boot()`.

Il charge `holophone-stability.js`, puis appelle :

```js
HolophoneStability.start(boot)
```

La couche stabilité :

1. exécute les migrations pré-boot ;
2. lance le boot historique ;
3. attend `bootReady` ;
4. câble la santé ;
5. lance un premier contrôle silencieux.

`holophone-v2.js` continue à attendre `bootReady` comme auparavant.

## Schéma

Clé :

```text
v3.schemaVersion
```

Valeur 3.0.0 :

```text
3000
```

Journal :

```text
v3.migrationLog
```

Les migrations doivent être :

- monotones ;
- idempotentes ;
- non destructives par défaut ;
- enregistrées seulement après succès.

Une version plus ancienne ne doit jamais tenter de rétro-migrer silencieusement un schéma futur.

## Santé

Dernier rapport :

```text
v3.lastHealth
```

Dernière recette runtime :

```text
v3.lastRecipe
```

Ces données ne contiennent pas de secrets.

## Sauvegardes

Sauvegarde complète :

```text
app = holophone-backup
v = 12
schemaVersion = 3000
```

Les anciennes sauvegardes restent acceptées tant que leur structure de base est compatible.

Le checksum SHA-256 est un contrôle d'intégrité, pas un mécanisme de chiffrement ni d'authentification.

## Snapshots

Snapshot automatique :

```text
app = holophone-auto-snapshot
v = 3
schemaVersion = 3000
```

Les secrets restent exclus.

Les blobs médias ne sont pas dupliqués dans les snapshots ; les métadonnées/références sont conservées et s'appuient sur IndexedDB déjà présent sur l'appareil.

## Restauration

Une restauration complète suit désormais :

```text
capture checkpoint runtime
        |
validation sauvegarde
        |
application
   |          |
 succès     erreur
   |          |
clear       rollback
checkpoint  checkpoint
```

Le rollback vise l'état applicatif. Des blobs ajoutés juste avant un échec peuvent rester orphelins ; l'outil `Nettoyer les médias orphelins` est prévu pour cela.

## Release

Le fichier `RELEASE.cmd` est le point d'entrée conseillé.

Pour 3.0.0 :

```text
RELEASE_3.0.0.cmd
```

Le script ne signe pas lui-même l'APK : la signature reste réalisée dans Android Studio avec le keystore existant.

Le script automatise uniquement la préparation contrôlée et réversible de la release.
