# Validation Holophone 2.8.7

## Contrôles effectués

### 1. JavaScript

Validation syntaxique OK sur :

- script inline de `www/index.html`
- `www/js/holophone-v2.js`

### 2. Assets web

Présence vérifiée du nouveau fichier :

- `www/media/joi_startup.mp3`

### 3. Synchronisation Capacitor

Synchronisation Android exécutée avec succès :

- copie des assets `www` vers `android/app/src/main/assets/public`
- mise à jour des plugins Android

Plugins détectés :

- `@capacitor/app@8.1.1`
- `@capacitor/filesystem@8.1.3`
- `@capacitor/keyboard@8.0.5`
- `@capacitor/local-notifications@8.3.1`
- `@mindlib-capacitor/send-intent@8.0.6`

## Points validés par lecture de code

- le splash ne peut se jouer qu'une seule fois par démarrage ;
- le splash ne démarre pas tant que l'écran de verrouillage est affiché ;
- après déverrouillage, la séquence de démarrage est relancée automatiquement ;
- l'échec éventuel de lecture audio n'interrompt pas le démarrage ;
- la transition vers l'écran principal reste gérée par le flux existant.

## À valider sur appareil

- rendu visuel réel du splash sur smartphone ;
- volume et rendu du jingle ;
- durée perçue de l'animation ;
- comportement avec code PIN activé ;
- comportement après installation par-dessus 2.8.6.
