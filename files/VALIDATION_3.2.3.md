# Validation Holophone 3.2.3

## Recette statique

`node scripts/test-stable-v323.js`

Résultat de référence : **63/63 contrôles OK** avant puis après `npx cap sync android`.

Contrôles spécifiques 3.2.3 :

- en-tête `À propos` fixe et centré ;
- logo VSNT `114 × 114 px` (~3 cm CSS) ;
- ancien dock latéral absent ;
- titre sous le logo ;
- boutons 🇫🇷 / 🇬🇧 `48 × 34 px`, centrés ;
- asset logo VSNT toujours identique à la source canonique ;
- traduction locale/persistante conservée ;
- aucune régression des 3.2.2 précédentes.

## Capacitor

`npx cap sync android` : OK, 5 plugins détectés.

## Gradle

Le build Gradle peut rester impossible dans l'environnement de génération lorsque `services.gradle.org` est inaccessible. Cela bloque avant compilation et ne constitue pas une validation de compilation Android.
