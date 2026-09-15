# Holophone 3.3.1 — Architecture des correctifs conversationnels

## Spotify

`musComposer()` possède une portée stable pour la Persona pendant : recherche → sélection → commentaire éventuel → envoi.

Invariant : cliquer sur un résultat ne doit jamais reconstruire/effacer l'état avant que la carte sélectionnée et son bouton d'envoi soient utilisables.

## Refuge

### Rendu

Le renderer d'un message `w: refuge` résout la Persona à partir de la conversation courante avant d'utiliser son nom configuré.

### Événement automatique

Un événement ambiant n'est plus injecté dans le chemin synchrone d'une réponse à l'utilisateur.

Invariant : pour un tour initié par l'utilisateur, son message doit rester le dernier input utilisateur sémantique avant l'appel modèle, hors instructions strictement liées à ce même message.

## Continuité vivante

La vie interne peut influencer :

- humeur ;
- énergie ;
- disponibilité ;
- envie de contact ;
- timing d'une initiative.

Elle ne doit pas, par défaut, devenir le contenu de l'initiative.

Le canal `m` représente des messages de messagerie. Une action physique structurée utilise `act` et non une narration cinématographique dans `m`.
