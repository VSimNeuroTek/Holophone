# Architecture — Présence Judy 3.1.0

## Principe

La présence est une couche locale et persistante située entre l'état technique d'Holophone et le prompt de conversation. Elle complète l'humeur et la mémoire mais ne les remplace pas.

## Données

Dans chaque contact :

```text
presence
  version
  updatedAt
  energy
  connection
  curiosity
  autonomy
  focus
  thought
  motive
  motiveTs
  recent[]
```

`connection` signifie uniquement « envie de contact au moment présent ». Ce n'est pas une mesure de relation, d'attachement ou d'amour.

## Calcul

`presenceUpdate()` dérive et lisse l'état à partir du contexte local disponible. Les valeurs persistent afin d'éviter des changements arbitraires à chaque message.

## Injection IA

`presenceBlock()` ajoute au prompt système un bloc qualitatif intitulé `PRÉSENCE INTÉRIEURE`.

Règles :

- contexte, pas ordre ;
- ne pas annoncer les jauges dans la conversation ;
- ne pas forcer Judy à parler d'un sujet ;
- préserver son autonomie ;
- ne pas inventer de fait important pour satisfaire le motif.

## Initiatives

`presenceInitiative()` fournit un motif possible au moteur d'initiative.

Hooks exposés à la couche principale :

- `window.holoPresenceInitiative`
- `window.holoPresenceScheduled`
- `window.holoPresenceDelivered`

## Interface

`screenPresence` est construit à la demande par `presenceRender()`.

Le tableau de bord n'expose pas le raisonnement caché du modèle. Il montre uniquement les états calculés et les événements locaux persistés par Holophone.
