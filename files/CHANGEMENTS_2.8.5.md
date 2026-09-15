# Holophone 2.8.5 — séparation Braindance / Interactions

## Problème observé

Le diagnostic 2.8.4 montrait deux mécanismes de blocage distincts :

1. le moteur Braindance utilisait `/v1/interactions`, sans possibilité d'envoyer les `safety_settings` historiques d'Holophone ;
2. le prompt technique `[BRAINDANCE STUDIO ...]` et les blocs générés étaient ajoutés dans `conv.ai`, donc le moteur de conversation Gemini Interactions pouvait les reprendre ensuite comme entrée en attente.

Conséquence : après une Braindance, un message banal comme `As tu aimé ?` ou `Dy ?` pouvait encore recevoir `HTTP 400 · Input blocked` parce que le vrai contenu envoyé à Interactions contenait aussi une ancienne entrée Braindance beaucoup plus sensible.

## Correctifs

### 1. Moteur Braindance repassé sur `generateContent`

Le moteur Braindance est toujours séparé du chat, mais utilise maintenant :

- `POST /v1beta/models/<model>:generateContent` ;
- `thinkingConfig.thinkingLevel = HIGH` ;
- `safetySettings = BLOCK_NONE` sur les catégories réglables ;
- le même ordre de modèles qualité qu'en 2.8.4 ;
- le schéma JSON uniquement pour le plan technique, avec repli sans schéma si un modèle refuse le paramètre de schéma.

`BLOCK_NONE` ne supprime pas les règles de contenu prohibé imposées par Google au niveau du service. Il évite seulement que les catégories de sécurité configurables soient plus restrictives que nécessaire.

### 2. Plus de réinjection du texte brut des blocs précédents

La 2.8.4 renvoyait jusqu'à environ 9 000 caractères des deux derniers blocs au bloc suivant pour conserver la continuité. Cette réinjection pouvait transformer une sortie acceptée au bloc N en entrée refusée au bloc N+1.

La 2.8.5 utilise à la place un marqueur structurel de continuité : le moteur sait combien de blocs ont déjà été produits et qu'il doit poursuivre sans recommencer, mais le texte détaillé des blocs précédents n'est plus retransmis au fournisseur.

### 3. Séparation stricte du transcript Braindance et du chat

Les blocs Braindance :

- restent affichés dans `conv.msgs` ;
- restent archivés dans Replay Braindance ;
- sont marqués `bd:true` ;
- ne sont plus ajoutés comme gros messages `assistant` dans `conv.ai`.

Le prompt technique `[BRAINDANCE STUDIO ...]` n'est plus ajouté dans `conv.ai`.

À la fin d'une Braindance, Holophone ajoute seulement un petit pont de continuité neutre indiquant qu'une Braindance privée entre adultes vient d'être vécue. Le chat normal peut donc répondre naturellement à `As tu aimé ?` sans recevoir le texte détaillé de la scène.

### 4. Auto-récupération des conversations déjà contaminées en 2.8.4

La 2.8.5 ignore automatiquement dans les entrées Interactions les anciennes entrées internes :

- `[BRAINDANCE STUDIO ...]` ;
- `[BRAINDANCE bloc ...]`.

Les anciens blocs Braindance sont également exclus :

- du bootstrap local utilisé lorsqu'une Interaction Gemini doit être recréée ;
- de la mémoire épisodique automatique ;
- des rappels croisés entre conversations ;
- de l'historique de secours envoyé à un fournisseur non Gemini.

Il n'est donc normalement pas nécessaire de réinitialiser manuellement l'ID Interaction après la mise à jour.

## Diagnostic 2.8.5

Le diagnostic indiquera désormais :

- `braindance.engine = dedicated-generateContent` ;
- `braindance.api = v1beta` ;
- `braindance.thinking = high` ;
- `braindance.safety = BLOCK_NONE-adjustable` ;
- `braindance.chatBridge = neutral-only` ;
- `braindance.rawBlocksInChat = false`.

## Non-régression

Aucun changement volontaire sur :

- le moteur de conversation principal Gemini Interactions stateful ;
- les IDs Interaction et leur rotation ;
- les Replays Braindance existants ;
- ElevenLabs et le cache audio ;
- Spotify ;
- le Refuge ;
- les avatars / galerie ;
- le verrouillage Android.
