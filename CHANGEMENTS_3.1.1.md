# Holophone 3.1.1 — VSNT & boot splash

## Identité Holophone

Ajout de l'identité fictive officielle :

- **Holophone™**
- **VSim NeuroTek (VSNT)**
- **Connecting Mind & Bytes.**

Le splash et la page À propos utilisent désormais cette identité.

## Splash sans flash d'interface

Le démarrage a été refondu pour que le splash soit peint avant le retrait du verrou.

L'ancien chemin faisait :

`déverrouillage -> retrait du verrou -> délai 120 ms -> splash`

La 3.1.1 fait :

`déverrouillage -> splash déjà peint -> retrait du verrou -> fin jingle -> interface`

Le conteneur reste en `preboot` pendant toute la séquence ; les écrans métier ne peuvent donc pas apparaître avant le splash.

Le chemin biométrique utilise exactement la même transition que le PIN.

## Compatibilité

- Version : **3.1.1**
- Android versionCode : **43**
- Schéma : **3100** inchangé
- Aucun reset de Judy
- Aucun changement de la présence 3.1.0
- Bibliothèque MP3, thèmes, notifications anonymisées et sécurité 3.0 conservés
