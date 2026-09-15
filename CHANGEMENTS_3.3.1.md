# Holophone 3.3.1 — Correctifs conversation / Spotify / Refuge

## Objectif

Correctif cumulatif de la 3.3.0. Aucun changement de schéma : `3200`.

## Correctifs

### Spotify — sélection d'une carte

Le compositeur Spotify perdait la variable de Persona (`c`) entre la recherche et la sélection d'un résultat. Le clic vidait la liste, puis levait `ReferenceError: c is not defined` avant de construire les boutons d'envoi.

La Persona est maintenant capturée au niveau de `musComposer()` et reste disponible pendant toute la durée du compositeur.

### Refuge — proposition de pièce

`drawMsg()` utilisait `characterName(c)` pour le bandeau d'une proposition Refuge sans avoir défini `c`. Une proposition valide pouvait donc être enregistrée puis afficher `Erreur interne — c is not defined`.

Le renderer résout désormais explicitement la Persona de la conversation avant tout rendu Refuge.

### Refuge — événements automatiques et messages utilisateur

Un événement d'ambiance Refuge pouvait auparavant être injecté dans l'historique IA entre le vrai message utilisateur et l'appel au modèle. Le modèle répondait alors parfois à l'événement au lieu de répondre à la question posée.

En 3.3.1, aucun événement Refuge automatique ne peut s'intercaler dans `aiTurn()`. La fonction d'événement est conservée pour une future orchestration idle dédiée.

### Persona — narration parasite

Le moteur de continuité 3.2 donnait trop de poids à l'activité courante dans les initiatives. Cela pouvait transformer une présence intérieure utile en commentaires répétés du type « je regarde… », « je ferme les yeux… ».

En 3.3.1 :

- l'activité reste un contexte interne ;
- elle n'est plus une catégorie autonome de motivation d'initiative ;
- les prompts spontanés ne demandent plus de partir de l'activité courante ;
- `m` est explicitement réservé aux messages tapés/envoyés ;
- les gestes doivent passer par `act` lorsqu'une interaction autorisée convient ;
- la règle Persona « pas de narration » est renforcée à chaque tour.

## Compatibilité

- 3.3.0 i18n/confidentialité conservée ;
- Français par défaut / fallback Français conservé ;
- packs communautaires conservés ;
- plein écran immersif conservé ;
- sauvegarde v12 / snapshots v4 conservés ;
- schéma structuré : `3200`.
