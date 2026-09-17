# Holophone 3.4.0 — Ergo + Prompt Diet

## Objectif
3.4.0 retire du surpilotage autour de Gemini Interaction et refond deux interfaces devenues trop chargées : Spotify et Refuge.

## Prompt Diet
Gemini Interaction reste le moteur principal. Holophone continue d'entretenir présence, humeur, activité et timing d'initiative, mais ces états ne sont plus injectés systématiquement dans le prompt conversationnel.

Contexte désormais injecté à la demande :
- Refuge : uniquement si le tour parle réellement du Refuge/maison/pièces/travaux.
- Interactions : uniquement lorsqu'un geste/interaction est réellement concerné.
- Activité locale : uniquement si l'utilisateur demande ce que fait la Persona ou un contexte proche.
- Présence/humeur détaillée : conservées côté UI et logique locale, pas récitées au modèle.

Les initiatives locales servent à décider *quand* écrire, plus *quoi* écrire.

## Décontamination
Au premier démarrage 3.4.0 :
- les Interaction IDs existants sont remis à zéro une seule fois ;
- les messages d'interactions physiques ne sont plus sélectionnés comme sources de mémoire épisodique ;
- les interactions réinjectées après rotation d'ID sont sérialisées sous forme structurée neutre.

Aucun historique visible ni souvenir explicite n'est effacé.

## Braindance
Aucun filtre anti-narration global. Braindance conserve son pipeline `generateContent` séparé et son contrat narratif.

## Spotify
Flux : compact -> résultats plein écran -> sélection focalisée -> message lié -> Envoyer/Annuler.

## Refuge
Nouvelle structure :
- bandeau d'actions flottant ;
- Maison (repliable) ;
- Pièces existantes (repliable, chaque pièce repliable) ;
- Historique des travaux (repliable).

## Ergonomie globale
Les panneaux de Réglages et Refuge sont repliés par défaut à chaque entrée. La hauteur redimensionnée des `textarea` est mémorisée sous `v7.ui.textareaHeights`.
