# Architecture Holophone 3.2.0 — Continuité vivante de la persona

## Objectif

La 3.2.0 enrichit la présence introduite en 3.1.0 sans créer de jauge de relation et sans remplacer le moteur conversationnel Gemini. Holophone conserve localement des états explicites qui donnent au personnage une continuité émotionnelle, temporelle et quotidienne entre deux messages et entre deux ouvertures de l'application.

Le principe central est : **contexte doux, jamais ordre rigide**. Les états locaux peuvent orienter une réponse ou autoriser/refuser une initiative, mais Gemini conserve la formulation naturelle et les règles utilisateur restent prioritaires.

## Presence v2

`www/js/holophone-v2.js` porte désormais `PRESENCE_VERSION=2`.

État principal :

```text
contact.presence
  energy
  connection
  curiosity
  autonomy
  focus
  thought
  motive / motiveTs
  lastObservedAt
  offlineGapMs
  lastLifeCatchupAt
  lastDecision / lastDecisionTs
  recent[]
```

`connection` signifie **envie momentanée de contact**. Ce n'est ni une affection, ni un amour, ni un niveau de relation.

## Émotion vécue

Une couche `contact.emotion` complète le `mood/fond` historique :

```text
version
family / nuance / level
startedAt / updatedAt
causeType / cause
undertone / undertoneLevel
stability
lastTransitionAt
```

Elle mémorise notamment depuis quand une humeur tient et ce qui l'a nourrie. Les causes sont des faits explicites gérés par Holophone (dernier échange, Refuge, activité, silence, temps écoulé), jamais une chaîne de pensée privée du modèle.

Fonctions de référence :

```text
emotion()
emotionSync()
emotionCauseFromConversation()
emotionDuration()
emotionLabel()
```

Les transitions `moodStep`, `decayMood` et `degradeMood` synchronisent cette couche.

## Vie hors conversation

`contact.life` devient une activité persistante et `contact.lifeTrail` conserve un historique borné des activités terminées.

Fonctions principales :

```text
activityPool(ts)
lifeScheduledName(c, ts)
lifeMakeBlock(c, start, previous)
lifeRemember(c, block)
lifeRecent(c, hours)
updateActivity(c, force)
activityContinuityText(c)
activityBlock(c)
```

Au retour dans l'application, Holophone rattrape le temps passé hors app en générant des blocs ordinaires cohérents avec les horaires de sommeil/travail configurés. Le rattrapage est borné afin d'éviter une explosion de données après une longue absence.

La vie hors conversation doit rester **banale et plausible** : lecture, détente, musique, activité personnelle, travail, sommeil, etc. Elle ne sert pas à inventer artificiellement des événements spectaculaires.

`schedState(c, ts)` peut désormais évaluer sommeil/travail à une date arbitraire, nécessaire au rattrapage hors ligne.

## Temps écoulé

`presenceUpdate()` mémorise le dernier instant observé et la durée d'absence. Au-delà d'un seuil significatif, un événement local de temps est créé. Le contexte peut ainsi distinguer une petite pause, plusieurs heures ou un changement de journée.

## Initiatives causales

`initiativeDecision(c, conv)` calcule localement une décision explicable à partir de :

- envie de contact ;
- curiosité ;
- énergie ;
- autonomie ;
- durée depuis le dernier échange ;
- sommeil/travail ;
- délai depuis la dernière initiative ;
- activité/focus courant ;
- continuité récente de vie.

Résultat :

```text
{ allow, score, reason, category, ts, gapMs }
```

Le moteur peut donc conclure **qu'il n'existe aucune bonne raison d'écrire maintenant**.

Les réglages utilisateur d'initiative restent le premier filtre. La décision causale est une barrière supplémentaire, jamais un moyen de contourner un `initiative off`.

Hooks :

```text
window.holoPresenceDecision
window.holoPresenceInitiative
window.holoPresenceScheduled
window.holoPresenceDelivered
```

`spontaneous()` et les notifications planifiées reçoivent désormais la raison interne retenue lorsqu'une initiative est autorisée.

## Écran Vie de la persona

L'écran présente des états explicites entretenus par Holophone :

- humeur vivante, intensité, durée, sous-ton, cause et stabilité ;
- activité actuelle et activités récentes ;
- énergie / envie de contact / curiosité / autonomie ;
- décision locale d'initiative et motif ;
- événements récents de continuité.

Il ne doit jamais être présenté comme l'affichage d'un raisonnement privé de Gemini.

## Persistance et migration

Schéma : `3200`.

Migration idempotente : `living-continuity-3.2.0` dans `holophone-stability.js`.

Elle crée/normalise :

```text
presence.version = 2
emotion.version = 1
life.version = 2
lifeTrail[]
```

`migrateData()` dans V2 refait également une normalisation légère afin qu'une restauration d'un ancien snapshot soit sûre même sans redémarrage complet du moteur de migrations.

Les snapshots automatiques passent en `v4` / `schemaVersion 3200`.

## Reset esprit

Le reset ciblé de l'esprit efface maintenant les états acquis de continuité :

```text
aff
memory/timeline selon le mécanisme existant
life
lifeTrail
presence
emotion
threads
```

L'identité, la persona configurée et les médias restent conservés conformément au comportement historique du reset.

## Non-objectifs 3.2.0

Cette version n'introduit volontairement pas :

- de jauge d'amour ;
- de relation chiffrée ;
- de refonte de la mémoire longue ;
- de micro-animation visuelle de la persona.

La suite prévue est une évolution séparée de la mémoire plus humaine et de la relation, afin de pouvoir mesurer les effets sans les mélanger à la continuité temporelle 3.2.0.
