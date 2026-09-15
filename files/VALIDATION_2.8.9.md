# Validation Holophone 2.8.9

## Validation JavaScript

Syntaxe vérifiée avec Node.js :

- script inline de `www/index.html` : OK
- `www/js/holophone-v2.js` : OK

## Synchronisation Capacitor

Synchronisation Android exécutée avec succès.

Plugins détectés :

- `@capacitor/app@8.1.1`
- `@capacitor/filesystem@8.1.3`
- `@capacitor/keyboard@8.0.5`
- `@capacitor/local-notifications@8.3.1`
- `@mindlib-capacitor/send-intent@8.0.6`

Les assets Android synchronisés contiennent bien :

- `APPV = 2.8.9`
- `media/joi_startup.mp3`

## Notifications anonymisées

Contrôle statique effectué :

- les notifications planifiées utilisent le titre `Holophone` ;
- le corps dépend uniquement du nombre de messages générés ;
- le prénom du contact n'est plus utilisé comme titre ;
- le premier message n'est plus utilisé comme corps de notification.

## Bibliothèque audio

Contrôle statique effectué sur :

- import multi-MP3 ;
- stockage IndexedDB ;
- miroir natif sous `DATA/ln_sounds` ;
- sélection séparée splash / notification ;
- suppression d'un MP3 ;
- migration du MP3 unique 2.8.8 ;
- export / import dans les sauvegardes avec médias.

## Résolution Android des sons

Le résolveur `SoundResolver.kt` vérifie désormais :

1. `res/raw` ;
2. le répertoire privé `files/ln_sounds` ;
3. les assets web Capacitor, y compris les chemins imbriqués comme `media/joi_startup.mp3`.

Le `FileProvider` du plugin autorise déjà :

- `files/ln_sounds/`
- `external-files/ln_sounds/`

La copie canonique du correctif est identique à celle présente dans `node_modules`.

## Compilation Gradle

Une compilation Gradle a été lancée, mais l'environnement de validation ne dispose pas d'accès réseau et ne possédait pas encore localement la distribution `gradle-8.14.3-all.zip`.

Le wrapper a donc échoué uniquement sur :

`UnknownHostException: services.gradle.org`

Ce blocage intervient avant la compilation du projet et ne constitue pas une erreur source Holophone.

## À valider sur smartphone

Le point principal restant est nécessairement matériel :

- lecture effective d'un MP3 importé comme son d'un canal Android 8+ ;
- comportement du bouton `Tester la notification` ;
- conservation du son après fermeture complète de l'application.
