# Changements Holophone 2.8.7

## Objet

Ajout d'une **séquence de démarrage audiovisuelle** avant l'affichage de l'écran principal.

## Démarrage Holophone Industry

Au lancement à froid de l'application, Holophone affiche désormais un écran temporaire :

- style visuel inspiré d'un boot screen corporate / synthétique ;
- logo animé **Holophone Industry** ;
- lignes de statut et balayage lumineux ;
- disparition automatique vers l'écran habituel après quelques secondes.

L'animation a été construite en HTML/CSS, sans dépendance supplémentaire.

## Audio de startup

Le fichier fourni par l'utilisateur est intégré dans l'application :

- fichier ajouté : `www/media/joi_startup.mp3`
- lecture automatique au lancement de la séquence de démarrage ;
- si l'audio ne peut pas être joué (restriction WebView, erreur ponctuelle, etc.), l'application poursuit quand même normalement.

## Compatibilité avec le verrouillage

Le comportement respecte la contrainte existante de sécurité :

- si le code PIN est actif, **le splash ne s'affiche pas avant la saisie du code** ;
- après déverrouillage, la séquence de démarrage s'exécute puis l'application révèle l'écran habituel.

Ainsi, aucun écran métier n'apparaît avant le verrouillage.

## Comportement de la séquence

- lancement : une seule fois par démarrage de l'application ;
- pas de relance simple au changement d'écran interne ;
- la durée reste courte ;
- si la durée audio est connue, Holophone ajuste légèrement le temps d'affichage pour mieux coller au jingle, avec une borne basse et une borne haute.

## Fichiers touchés

- `www/index.html`
- `www/media/joi_startup.mp3`
- `02_PREPARER_ANDROID_STUDIO.cmd`
