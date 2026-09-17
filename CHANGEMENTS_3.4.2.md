# Holophone 3.4.2 — Hotfix sauvegarde mémoire

## Problème corrigé

La sauvegarde globale 3.4.1 pouvait provoquer un crash Android `OutOfMemoryError` lorsque la médiathèque locale était volumineuse.

Le format v13 construisait en mémoire un objet JSON unique contenant les structures métier, les médias convertis en Data URL et une copie exhaustive d'IndexedDB, puis sérialisait l'ensemble avec `JSON.stringify()` avant de le transmettre à Capacitor Filesystem. Sur un appareil avec beaucoup de médias, ce chemin pouvait demander plusieurs centaines de Mo temporaires.

## Nouveau format global v14

La 3.4.2 ajoute `www/js/holophone-backup342.js` et remplace le bouton de sauvegarde globale par un export progressif :

- un seul fichier `.holo` dans `Documents/Holophone/saves` ;
- format JSONL version 14 ;
- blobs IndexedDB découpés en blocs de 192 Kio ;
- écriture native incrémentale avec `Filesystem.appendFile` ;
- médias référencés par leurs IDs IndexedDB au lieu d'être dupliqués dans plusieurs structures ;
- contrôle SHA-256 par enregistrement/bloc lorsque WebCrypto est disponible ;
- suppression du fichier partiel si l'export échoue.

## Restauration

La restauration `.holo` est elle aussi progressive :

- lecture du fichier par blocs de 512 Kio ;
- vérification des blocs ;
- staging des données IndexedDB sous des clés temporaires ;
- bascule transactionnelle du stockage binaire seulement après validation complète ;
- nettoyage automatique du staging en cas d'échec.

Les sauvegardes JSON v12/v13 restent importables par l'ancien chemin de restauration.

## Non-régressions visées

- `toyList(c)` 3.4.1 est conservé ;
- clés API toujours optionnelles ;
- schéma de données inchangé : 3200 ;
- aucune modification des conversations, de la Persona ou du moteur Gemini ;
- la sauvegarde globale contient toujours les médias.

## Recette

Nouveau test : `scripts/test-stable-v342.js`.

Il vérifie notamment l'écriture incrémentale, l'absence du chemin `buildBackup(true)` sur le bouton principal, la compatibilité v12/v13, le staging IndexedDB, l'intégrité par bloc et la présence du correctif `toyList`.
