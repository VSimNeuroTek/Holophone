# Architecture — À propos VSNT 3.2.1

## Objectif

La page **À propos** n'est plus une aide utilisateur légère. Elle devient la fiche d'identité technique de Holophone dans l'univers VSim NeuroTek, tout en restant fidèle à l'architecture réelle de l'application.

## Principes

- conserver le logo VSNT orange sur fond noir validé ;
- présenter Holophone™ comme une **Adaptive Persona Interface** de la division fictive **Synthetic Presence Systems** ;
- décrire les briques réellement présentes : Persona Runtime, mémoire, continuité temporelle, interaction multimodale, initiatives et protections locales ;
- ne pas prétendre à des fonctions absentes (interface cerveau-machine, capteurs biologiques, cloud propriétaire, etc.) ;
- distinguer clairement données persistantes locales et appels aux fournisseurs externes ;
- rappeler que les clés de service ne sont pas intégrées à l'application distribuée.

## Présentation

Le héros de la page expose :

```text
VSNT // Synthetic Presence Systems
Holophone™ · Adaptive Persona Interface
Persistent Persona · Temporal Continuity · Local-First · Multimodal Runtime
```

La zone **Core systems** est composée de six modules :

```text
Persona Runtime
Memory Fabric
Temporal Engine
Interaction Layer
Initiative Core
Privacy Architecture
```

Les couleurs suivent le thème Holophone actif, sauf le logo raster VSNT qui conserve son orange/noir d'origine.

## Données

La formulation retenue est volontairement précise : les données persistantes résident localement, mais les fonctionnalités utilisant Gemini, ElevenLabs, Spotify ou d'autres services peuvent transmettre les informations nécessaires au fournisseur correspondant.

## Version

```text
versionName 3.2.1
versionCode 48
schemaVersion 3200
```

Aucune migration de données n'est introduite par cette version.
