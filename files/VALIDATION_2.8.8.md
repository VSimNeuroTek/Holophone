# Validation Holophone 2.8.8

## Contrôles de syntaxe

Validation effectuée avec `node --check` sur :

- le JavaScript inline extrait de `www/index.html` ;
- `www/js/holophone-v2.js`.

Résultat : **OK**.

## Version

Les deux constantes ont été mises à jour :

- moteur principal : `2.8.8` ;
- module `HolophoneV2` : `2.8.8`.

Le bandeau affiche `Holophone v2.8.8`.

## Jingle d'origine

Le fichier intégré a été contrôlé :

- nom : `joi_startup.mp3` ;
- taille : environ 64 Ko ;
- durée détectée : environ 3,97 secondes.

## Persistance

Le paramètre `v7.startup` contient :

- le style choisi ;
- la source intégrée ou personnalisée ;
- le nom du fichier ;
- la durée ;
- la taille.

Le MP3 personnalisé est stocké sous la clé IndexedDB :

```text
startup_jingle_custom
```

## Synchronisation audio

La fermeture du splash attend l'événement audio `ended`.

Un délai technique supplémentaire n'est utilisé que comme garde-fou si le lecteur ne fournit pas correctement l'événement attendu.

## Sauvegarde

Le format de sauvegarde passe à la révision 10 et peut inclure la configuration de démarrage et le MP3 personnalisé.

## Synchronisation Capacitor

`cap sync android` a été exécuté avec succès.

Plugins détectés :

- `@capacitor/app@8.1.1`
- `@capacitor/filesystem@8.1.3`
- `@capacitor/keyboard@8.0.5`
- `@capacitor/local-notifications@8.3.1`
- `@mindlib-capacitor/send-intent@8.0.6`

## Tests restant à faire sur appareil

- rendu exact des quatre variantes ;
- lecture automatique après lancement à froid ;
- import d'un MP3 depuis le sélecteur Android ;
- persistance après redémarrage ;
- affichage avec PIN actif ;
- comportement avec un MP3 long ;
- restauration depuis une sauvegarde contenant le jingle personnalisé.
