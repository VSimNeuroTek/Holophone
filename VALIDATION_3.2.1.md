# Validation Holophone 3.2.1

## Résultats obtenus

- reconstruction d'une base Holophone 3.1.4 à partir de la source 2.8.4 + patches successifs : OK ;
- application du payload cumulatif 3.2.1 : OK ;
- recette statique avant synchronisation : **58/58 OK** ;
- `cap sync android` : OK ;
- 5 plugins Capacitor détectés ;
- recette après synchronisation : **58/58 OK** ;
- syntaxe JavaScript inline : OK ;
- `holophone-v2.js` : OK ;
- `holophone-stability.js` : OK ;
- fichiers Gradle/properties critiques sans BOM : OK.

## Contrôles spécifiques 3.2.1

La recette vérifie en plus :

- présence de `Synthetic Presence Systems` ;
- titre `Holophone™ · Adaptive Persona Interface` ;
- modules Persona Runtime, Memory Fabric, Temporal Engine, Interaction Layer, Initiative Core et Privacy Architecture ;
- mention Local-first et absence de clés de service intégrées ;
- disparition des anciennes accroches `Un téléphone de fiction` et `Comment ça marche` ;
- conservation du logo VSNT orange/noir validé ;
- cohérence APPV / moteur V2 / couche stabilité en 3.2.1 ;
- conservation du schéma 3200 et de toute la continuité vivante 3.2.0.

## Non-régression

Les contrôles 3.2.0/3.1.x restent actifs : plein écran immersif, neutralité de Persona, splash atomique, branding VSNT, médias persistants, notifications anonymes, mémoire, Refuge, Braindance, thèmes et sauvegardes.

## Gradle

Comme pour les versions précédentes, l'environnement de validation ne peut pas certifier le build Gradle final si la distribution `gradle-8.14.3-all.zip` doit être téléchargée depuis `services.gradle.org`. La validation Web/Capacitor est complète ; la génération signée reste à effectuer dans Android Studio sur le poste utilisateur.
