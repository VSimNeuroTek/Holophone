# Holophone 3.2.2 — À propos flottant et bilingue

## Objectif

La page `À propos` conserve la fiche système VSNT introduite en 3.2.1, mais corrige l'absence du logo dans l'APK et améliore sa présentation sur mobile.

## Logo VSNT

Le PNG définitif fourni par l'utilisateur est embarqué explicitement dans :

- `www/media/vsnt-logo-full.png` pour le runtime ;
- `assets/branding/vsnt-logo-full-source.png` comme source canonique.

Les deux fichiers sont identiques octet pour octet et sont vérifiés par SHA-256 dans la recette statique.

Le logo n'est plus rendu comme une grande image dans le contenu scrollable. Il est placé dans le bandeau fixe de la page `À propos`, à droite du titre, en 76 × 76 CSS px (68 × 68 sur les écrans très étroits). Il n'a ni bordure, ni cadre, ni halo CSS ajouté : le rendu visuel est celui du fichier fourni.

Le bandeau `title` étant extérieur au conteneur `.cfg` qui défile, le logo reste visible pendant tout le scroll sans recouvrir les cartes techniques.

## Français / English

Deux boutons drapeaux sont placés sous le logo :

- 🇫🇷 Français ;
- 🇬🇧 English.

La traduction est instantanée et entièrement locale. Aucun appel Gemini, aucun service web et aucune permission supplémentaire ne sont utilisés.

Le choix est mémorisé dans `localStorage` sous la clé `v7.aboutLang`. En l'absence de préférence enregistrée, Holophone suit la langue du navigateur/appareil (`fr` si locale française, `en` sinon).

La traduction couvre le titre, le sous-titre, la présentation produit, les badges, les six modules, l'architecture des données, les Persona packages et la présentation VSNT. Les noms de briques produits (`Persona Runtime`, `Memory Fabric`, etc.) restent des noms techniques communs aux deux langues.

## Données / migration

Aucune migration de schéma n'est nécessaire. Le schéma reste `3200`. Le choix de langue de la page `À propos` est une préférence d'interface indépendante des données Persona.
