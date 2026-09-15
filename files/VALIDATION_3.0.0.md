# Validation Holophone 3.0.0

## Validation automatique effectuée

### JavaScript

- script inline `www/index.html` : syntaxe OK ;
- `www/js/holophone-v2.js` : syntaxe OK ;
- `www/js/holophone-stability.js` : syntaxe OK.

### Recette statique

Résultat final :

```text
25/25 contrôles OK
```

Contrôles couverts :

- versions 3.0.0 ;
- ordre stabilité -> V2 ;
- schéma 3000 ;
- sauvegarde v12 + SHA-256 ;
- rollback restauration ;
- snapshots v3 ;
- import MP3 multi-fichiers ;
- notifications anonymisées ;
- résolution sonore Android ;
- FLAG_SECURE ;
- backup système Android désactivé ;
- BiometricPrompt correct ;
- `onResume()` public ;
- isolation Braindance ;
- permissions Interactions ;
- cinq thèmes ;
- priorité PIN/splash ;
- splash après biométrie ;
- restauration du patch `SoundResolver.kt` ;
- absence de `Set-Content -Encoding UTF8` dangereux ;
- release sans `$1/$133` ;
- présence de l'outillage ;
- syntaxe des scripts ;
- absence de BOM sur les fichiers critiques.

### Capacitor

Synchronisation Android réussie.

Plugins détectés :

```text
@capacitor/app@8.1.1
@capacitor/filesystem@8.1.3
@capacitor/keyboard@8.0.5
@capacitor/local-notifications@8.3.1
@mindlib-capacitor/send-intent@8.0.6
```

## Compilation Gradle

Une tentative a été faite avec :

```text
./gradlew assembleDebug --offline --no-daemon
```

Le wrapper a malgré tout tenté de télécharger :

```text
https://services.gradle.org/distributions/gradle-8.14.3-all.zip
```

L'environnement de validation n'ayant pas accès au réseau, l'exécution s'est arrêtée sur :

```text
java.net.UnknownHostException: services.gradle.org
```

L'échec intervient avant la compilation des sources Android et ne constitue donc pas une erreur de code détectée.

## Validation téléphone encore nécessaire

Avant de considérer la 3.0.0 comme définitivement validée sur appareil :

- construire l'APK release dans Android Studio ;
- installer par-dessus la version courante ;
- exécuter la recette mobile indiquée dans `RELEASE_3.0.0.md` ;
- vérifier particulièrement les sons de notifications importés, le splash, le PIN/biométrie et une restauration de sauvegarde de test.

## Gel comportemental Judy

Aucune modification volontaire du comportement de Judy n'a été réalisée dans ce lot.
