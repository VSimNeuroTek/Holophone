# Holophone 3.1.3 — Correctif galerie vidéo / musique

## Corrigé

- le catalogue **Vidéos YouTube / Musique Spotify** ne repose plus sur une écriture non vérifiée de la fiche contact ;
- ajout d'une copie durable dédiée dans IndexedDB ;
- relecture de contrôle après chaque ajout ;
- rollback de l'ajout en cas d'échec de persistance ;
- suppression et renommage musique resynchronisés ;
- restauration d'une sauvegarde complète resynchronise également ce catalogue ;
- la clé de métadonnées n'est pas signalée comme média orphelin par Santé Holophone ;
- diagnostic : ajout du compteur `videoCatalog`.

## Branding

- la page **À propos** utilise désormais le nouveau logo VSNT néon orange sur fond noir fourni par l'utilisateur ;
- la source canonique `assets/branding/vsnt-logo-full-source.png` est alignée sur ce visuel.

## Inchangé

- moteur Judy / présence 3.1.0 ;
- boot atomique 3.1.1 ;
- animation splash VSNT 3.1.2 ;
- icône Android blanche transparente 3.1.2 ;
- schéma de données `3100` ;
- sauvegarde v12.

## Release

```text
versionName 3.1.3
versionCode 45
```
