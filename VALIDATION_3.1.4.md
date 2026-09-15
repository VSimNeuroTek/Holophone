# Validation Holophone 3.1.4

## Résultats obtenus

- syntaxe JavaScript inline : OK ;
- `holophone-v2.js` : OK ;
- `holophone-stability.js` : OK ;
- recette statique : **50/50 OK** ;
- audit du code de production : **0 occurrence du prénom historique** dans Web, Android natif et scripts ;
- `npx cap sync android` : OK ;
- 5 plugins Capacitor détectés ;
- recette après synchronisation et restauration du MainActivity canonique : **50/50 OK**.

## Gradle

Le test :

```text
:app:compileDebugKotlin
:app:compileDebugJavaWithJavac
```

ne peut pas atteindre la compilation dans l'environnement de validation : le wrapper tente de télécharger `gradle-8.14.3-all.zip` depuis `services.gradle.org` et échoue sur `UnknownHostException` faute d'accès réseau.

Ce résultat n'est donc ni une réussite ni une erreur de compilation du code Android 3.1.4.

## Points vérifiés spécifiquement

- `WindowCompat.setDecorFitsSystemWindows(..., false)` ;
- masquage de `systemBars()` ;
- barres transitoires par swipe ;
- gestion du cutout ;
- réapplication au resume/focus ;
- `onResume()` public ;
- `FLAG_SECURE` / confidentialité Recents conservés ;
- catégorie Réglages `Persona` ;
- identité dynamique ;
- migration schema 3140 ;
- compatibilité anciens rôles, clés et IndexedDB ;
- absence de BOM sur les fichiers critiques.
