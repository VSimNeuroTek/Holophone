# Validation — Holophone 3.1.2

## Contrôles réalisés dans l'environnement de préparation

- syntaxe JavaScript inline : OK ;
- `www/js/holophone-v2.js` : OK ;
- `www/js/holophone-stability.js` : OK ;
- géométrie VSNT Concept 03 v7 présente dans le splash ;
- quatre palettes VSNT présentes ;
- replay de l'animation présent ;
- attente de fin d'animation présente ;
- logo complet `www/media/vsnt-logo-full.png` identique au fichier utilisateur ;
- sources de branding archivées dans `assets/branding` ;
- icônes launcher générées en PNG RGBA avec coins transparents ;
- adaptive background Android transparent ;
- version Web/V2/Stability = 3.1.2.

## Limite de validation

Le projet source complet et `node_modules` ne sont pas présents dans ce runtime de préparation ; `npx cap sync android` et la compilation Gradle ne peuvent donc pas être rejoués ici sur l'arborescence complète. La recette `scripts/test-stable-v312.js` est fournie pour s'exécuter sur le projet utilisateur lors de `RELEASE_3.1.2.cmd` avant et après la synchronisation Capacitor.
