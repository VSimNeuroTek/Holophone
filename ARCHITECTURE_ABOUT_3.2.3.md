# Architecture — À propos 3.2.3

## Objectif

La page `À propos` conserve la fiche système VSNT bilingue introduite en 3.2.1/3.2.2, mais son en-tête devient une zone fixe centrée et plus lisible.

## Zone flottante

L'en-tête `aboutfloatinghead` est hors du conteneur scrollable `.cfg`. Il reste donc visible pendant le défilement du contenu technique.

Ordre visuel :

1. logo VSNT définitif centré ;
2. titre `À PROPOS` / `ABOUT` centré ;
3. sélecteur 🇫🇷 / 🇬🇧 centré ;
4. bouton de fermeture conservé en haut à droite.

Le logo utilise `www/media/vsnt-logo-full.png`, sans bordure ni halo CSS ajouté. Sa taille cible est `114 × 114 CSS px`, soit environ 3 cm à 96 dpi. Sur les écrans très étroits, il descend légèrement à 108 px pour préserver les marges.

Les drapeaux passent à `48 × 34 px` avec une taille de glyphe de 24 px. La préférence de langue reste stockée sous `v7.aboutLang` et la traduction reste 100 % locale.

## Non-régression

Aucun changement de schéma, de Persona, de Continuité vivante, de mémoire, de média ou de logique Android n'est introduit en 3.2.3.
