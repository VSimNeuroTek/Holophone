# Holophone 3.1.1 — Architecture du boot et identité VSNT

## Objectif

Garantir qu'après le déverrouillage PIN ou biométrique, le splash Holophone est le premier écran visible, sans flash de l'accueil ni délai artificiel.

## Identité produit

- Produit : **Holophone™**
- Société fictive : **VSim NeuroTek (VSNT)**
- Slogan : **Connecting Mind & Bytes.**

Cette identité est reprise dans le splash et la page À propos.

## Ordre de démarrage

Le conteneur `#app` démarre avec la classe `preboot`. Tant que cette classe existe, tous les écrans métier sont invisibles ; seuls le verrou et le splash peuvent être peints.

Ordre garanti :

1. lecture du verrou ;
2. PIN / biométrie si actif ;
3. préparation du splash sous le verrou ;
4. peinture immédiate du splash ;
5. retrait du verrou ;
6. lecture du jingle jusqu'à sa fin réelle ;
7. retrait de `preboot` ;
8. affichage de l'interface Holophone.

Le délai historique de 120 ms entre déverrouillage et splash a été supprimé.

## Fonctions principales

- `startupRevealImmediate(force, allowLocked)` : rend le splash visible de façon synchrone ;
- `unlockWithStartup()` : transition atomique PIN/biométrie vers splash ;
- `bootSplashTransition()` : chemin sans verrou ;
- `startupRunVisible(el, revealAppAtEnd)` : garde le métier masqué jusqu'à la fin du splash ;
- `window.holoUnlockAfterAuth` : point d'entrée partagé avec le module biométrique V2.

## Compatibilité

- Aucun changement du schéma de données : reste **3100**.
- Aucun changement de mémoire, présence ou comportement de Judy.
- Styles de splash et bibliothèque MP3 existants conservés.
- La durée du splash reste pilotée par la durée réelle du MP3 sélectionné.
