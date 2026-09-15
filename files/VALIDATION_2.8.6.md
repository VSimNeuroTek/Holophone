# Validation Holophone 2.8.6

## Contrôles réalisés

### JavaScript

- `node --check` sur le script principal extrait de `www/index.html` : **OK**
- `node --check www/js/holophone-v2.js` : **OK**

### Capacitor

Synchronisation testée sur une copie complète du projet :

```text
Copying web assets ... OK
Updating Android plugins ... OK
Found 5 Capacitor plugins
Sync finished ... OK
```

Plugins détectés :

- `@capacitor/app@8.1.1`
- `@capacitor/filesystem@8.1.3`
- `@capacitor/keyboard@8.0.5`
- `@capacitor/local-notifications@8.3.1`
- `@mindlib-capacitor/send-intent@8.0.6`

Dans l'environnement de validation Linux, l'exécutable `cap` extrait du ZIP n'avait pas son bit d'exécution.
Le test a donc été lancé directement avec le CLI Node de Capacitor.
Cela n'affecte pas le `.cmd` Windows ni `npx cap sync android` sur le poste cible.

## Vérifications de conception

- migration par défaut des anciennes interactions vers `both` ;
- filtrage utilisateur avant affichage ;
- filtrage personnage avant construction du prompt ;
- filtrage des alternatives de réponse ;
- rejet final d'une action personnage non autorisée ;
- garde-fou final dans les fonctions d'envoi ;
- prénom du personnage lu depuis le contact courant ;
- recherche sans casse et sans accents ;
- barre sticky pour recherche / pliage.

## Build Gradle

Le build APK signé reste à réaliser dans Android Studio après réglage manuel de :

```gradle
versionCode 36
versionName "2.8.6"
```
