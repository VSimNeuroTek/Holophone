# Changements Holophone 2.8.9

## Notifications anonymisées

Les notifications d'initiative ne révèlent désormais plus :

- le prénom du personnage ;
- le contenu du message ;
- un extrait de conversation.

Le format devient :

- titre : `Holophone`
- corps : `1 nouveau message` ou `X nouveaux messages`

Au premier démarrage de la 2.8.9, Holophone annule les notifications encore planifiées par une version antérieure afin qu'aucune ancienne notification contenant un prénom ou un extrait ne puisse ressortir plus tard.

## Bibliothèque audio commune

L'écran `Réglages > Application > Démarrage & sons` devient le bac commun des MP3.

Il permet désormais :

- d'importer plusieurs MP3 ;
- de conserver tous les morceaux importés ;
- de choisir indépendamment le MP3 du splash ;
- de choisir indépendamment le son des notifications ;
- d'utiliser le même MP3 pour les deux usages ;
- de supprimer un MP3 importé ;
- de tester le splash ;
- de tester une notification anonyme.

Le jingle intégré `joi_startup.mp3` reste présent dans la bibliothèque.

Le son système Android reste également disponible pour les notifications.

## Migration depuis 2.8.8

La 2.8.8 ne conservait qu'un seul MP3 personnalisé.

Lors de la première ouverture en 2.8.9 :

- ce MP3 est automatiquement migré dans la nouvelle bibliothèque ;
- s'il était le jingle actif, il reste sélectionné pour le splash ;
- aucune réimportation manuelle n'est nécessaire.

## Splash

Le comportement introduit en 2.8.8 est conservé :

- le splash reste affiché jusqu'à la fin réelle du MP3 sélectionné ;
- le choix visuel `Classique / Wallace-Joi / Minimaliste / Cyberpunk` reste inchangé.

## Sons de notification Android

Les MP3 importés sont conservés dans le stockage privé de l'application et copiés dans un répertoire dédié utilisable par Android pour les notifications.

Sur Android 8 et versions suivantes, le son appartient au canal de notification. Holophone utilise donc un canal distinct par MP3 afin qu'un changement de morceau soit réellement pris en compte.

Le résolveur de sons du plugin `@capacitor/local-notifications` a été adapté pour accepter :

- les sons intégrés dans les assets web, y compris `media/joi_startup.mp3` ;
- les MP3 importés à l'exécution et stockés dans `files/ln_sounds`.

Une copie canonique du correctif est conservée sous :

`scripts/patches/local-notifications/SoundResolver.kt`

`02_PREPARER_ANDROID_STUDIO.cmd` la recopie automatiquement dans `node_modules` avant chaque synchronisation Capacitor. Ainsi, un futur `npm install` ne casse pas silencieusement le support des MP3 de notification.

## Sauvegarde

La sauvegarde complète avec médias inclut désormais :

- la configuration du splash ;
- le choix du son de notification ;
- la liste des MP3 importés ;
- le contenu binaire des MP3 importés.

Le format de sauvegarde passe à la révision 11.
