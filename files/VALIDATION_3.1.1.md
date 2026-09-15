# Validation Holophone 3.1.1

## Résultats

- recette statique : **33/33 OK** ;
- `npx cap sync android` : **OK** ;
- 5 plugins Capacitor détectés ;
- assets Android synchronisés en 3.1.1 ;
- identité VSNT présente dans les assets Android ;
- PIN et biométrie utilisent la transition splash atomique ;
- aucun appel `maybeRunStartupSplash(120)` restant sur le chemin de déverrouillage ;
- `preboot` masque les écrans métier jusqu'à la fin du splash ;
- syntaxe JavaScript inline/externe : OK ;
- fichiers Gradle/PowerShell critiques : sans BOM.

## Limite de validation

Le build Gradle complet peut rester impossible dans l'environnement de préparation si la distribution Gradle n'est pas déjà en cache et que `services.gradle.org` est inaccessible. La compilation APK signée reste à valider sur le poste Windows/Android Studio de release.
