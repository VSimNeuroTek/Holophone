# Holophone 3.1.0 — Lot 2 / Présence de Judy

## Objectif

Première évolution du Lot 2 : donner à Judy une continuité intérieure entre les messages sans transformer Holophone en système de jauges relationnelles ni modifier artificiellement sa personnalité.

## Présence persistante

Chaque personnage possède désormais un état `presence` persistant :

- énergie ;
- envie momentanée de contact ;
- curiosité ;
- autonomie ;
- activité / focus ;
- pensée d'arrière-plan synthétique ;
- motif possible d'initiative ;
- petite chronologie récente.

Ces valeurs servent de contexte doux. Elles ne sont pas des obligations de réponse, ne sont pas récitées au personnage et ne constituent pas un score d'amour.

## Continuité avec la vie de Judy

La présence évolue à partir d'éléments déjà connus par Holophone :

- moment de la journée et rythme veille/sommeil ;
- activité courante ;
- humeur de fond ;
- délai depuis le dernier message de l'utilisateur ;
- interactions, refuge, médias et initiatives récentes.

Le moteur évite de créer artificiellement de grands événements pour justifier une initiative.

## Initiatives plus motivées

Lorsqu'une initiative est autorisée, le moteur fournit désormais à Judy un élan intérieur possible. Elle peut l'utiliser si cela rend le message naturel, mais peut aussi l'ignorer.

Les initiatives programmées et réellement délivrées sont enregistrées dans la chronologie de présence.

## Écran « Vie de Judy »

Un nouvel écran est disponible dans :

`Réglages > Personnage > Vie de Judy`

Il affiche :

- activité actuelle ;
- énergie ;
- envie de contact ;
- curiosité ;
- autonomie ;
- fil intérieur synthétique ;
- événements récents ;
- éléments de continuité (mémoire, épisodes, goûts, session Interaction).

Cet écran expose des états fonctionnels de Holophone, pas la chaîne de raisonnement privée du modèle.

Le prénom est dynamique : si le personnage est renommé, le menu et le titre suivent automatiquement.

## Migration 3.1

Schéma : `3100`.

La migration `judy-presence-3.1.0` ajoute les données de présence aux personnages existants sans supprimer ni réinitialiser mémoire, goûts, conversations ou Interaction ID.

## Corrections Santé issues du diagnostic 3.0.0

Le diagnostic 3.0.0 a permis d'identifier plusieurs faux positifs, corrigés ici :

- les messages `refuge` ne sont plus comptés comme atypiques ;
- le jingle intégré `builtin` est reconnu comme choix valide de notification ;
- les MP3 de la bibliothèque audio sont comptés comme médias référencés ;
- l'avertissement snapshot utilise un seuil cohérent avec la cadence automatique maximale de 6 h.

## Version

- application : 3.1.0
- versionCode Android : 42
- schéma de données : 3100
