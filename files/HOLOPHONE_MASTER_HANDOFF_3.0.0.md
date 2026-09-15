# HOLOPHONE — DOCUMENT MAÎTRE DE PASSATION 3.0.0

**Référence actuelle : Holophone 3.0.0 — Lot 1 Stabilisation technique**  
**Android : `versionName "3.0.0"` / `versionCode 41`**  
**Schéma de données : `3000`**  
**Package historique conservé : `com.mudva.lumen`**

Ce fichier est la référence à transmettre à une nouvelle conversation avec le dernier projet source ou le dernier patch effectivement installé.

> **Priorité documentaire :** les règles de cette section 3.0.0 remplacent toute règle contradictoire présente dans la consolidation 2.9.0 plus bas. La partie 2.9.0 est conservée parce qu'elle contient l'architecture métier complète et l'historique utile.

---

# A. État de référence 3.0.0

La 3.0.0 correspond au **Lot 1 : sécuriser et stabiliser Holophone**.

Le comportement de Judy est gelé volontairement pendant ce lot. Aucune évolution intentionnelle de sa personnalité, de son style de réponse, de son humeur, de sa mémoire ou de ses initiatives n'est introduite. Une variation notable doit donc être traitée comme une régression.

La prochaine grande phase prévue est le **Lot 2 : évolution profonde de Judy**, mais elle ne doit commencer qu'après recette réelle de la 3.0.0 sur téléphone.

## A.1 Fichiers de référence nouveaux

```text
www/js/holophone-stability.js
scripts/test-stable-v300.js
scripts/release-safe.ps1
TESTER_STABLE_3.0.0.cmd
RELEASE.cmd
RELEASE_3.0.0.cmd
ARCHITECTURE_STABILITE_3.0.0.md
CHANGEMENTS_3.0.0.md
RELEASE_3.0.0.md
RECETTE_STABLE_3.0.0.md
VALIDATION_3.0.0.md
```

## A.2 Architecture 3.0

Le gros `www/index.html` existe encore. Il ne faut pas effectuer une découpe massive juste avant la stable.

La modularisation commence par une couche technique distincte :

```text
index.html
   -> holophone-stability.js
      -> schéma / migrations
      -> santé
      -> intégrité sauvegardes
      -> rollback restauration
      -> recette runtime
   -> holophone-v2.js
      -> mémoire / Interactions / snapshots / télémétrie
```

Le moteur conversationnel historique n'a pas été déplacé dans cette version.

---

# B. Démarrage et migrations

`index.html` ne lance plus directement `boot()`.

Le flux est :

```text
HolophoneStability.start(boot)
        |
        +-- migrations pré-boot
        +-- boot historique
        +-- attente bootReady
        +-- câblage Santé
        +-- contrôle silencieux
```

Clés :

```text
v3.schemaVersion = 3000
v3.migrationLog
v3.lastHealth
v3.lastRecipe
```

Les migrations sont monotones, idempotentes et non destructives par défaut.

La migration 3.0 normalise notamment :

- droits d'Interactions ;
- thème ;
- splash ;
- bibliothèque audio.

Attention : le vieux MP3 custom 2.8.8 doit pouvoir migrer. Un `source=custom` sans `audioId` ne doit donc pas être remplacé prématurément par `builtin`.

---

# C. Santé Holophone

Chemin :

```text
Réglages > Sous le capot > Santé Holophone 3.0
```

Contrôles :

- schéma ;
- localStorage ;
- IndexedDB ;
- Documents/Holophone ;
- cohérence contacts/conversations ;
- thème / clavier ;
- droits Interactions ;
- bibliothèque audio ;
- médias référencés, manquants et orphelins ;
- snapshots ;
- notifications ;
- SecureStore ;
- CPU/RAM ;
- traces Braindance legacy.

Actions :

```text
Contrôler
Réparation sûre
Recette technique
```

La réparation sûre ne doit pas supprimer de conversation ni de média référencé.

---

# D. Sauvegardes et snapshots

## D.1 Sauvegarde complète

Format courant :

```text
app = holophone-backup
v = 12
schemaVersion = 3000
appVersion = 3.0.0
```

Les nouvelles sauvegardes incluent un bloc `integrity` avec SHA-256 lorsque WebCrypto est disponible.

À la restauration :

- schéma futur refusé ;
- SHA-256 invalide refusé ;
- conversation pointant vers un contact absent refusée ;
- checkpoint runtime pris avant mutation ;
- rollback automatique si l'import échoue.

Le SHA-256 vérifie l'intégrité, il ne chiffre pas la sauvegarde.

## D.2 Snapshots automatiques

Format courant :

```text
app = holophone-auto-snapshot
v = 3
schemaVersion = 3000
```

Ils couvrent désormais aussi :

- Interactions ;
- Braindance ;
- thème ;
- splash ;
- métadonnées de bibliothèque audio.

Les secrets restent exclus.

---

# E. Vie privée / Android

Points qui doivent rester vrais :

- `FLAG_SECURE` actif ;
- barre de navigation Android masquée ;
- aucun écran métier avant PIN ;
- SecureStore / Android Keystore pour les secrets quand disponible ;
- notifications anonymisées ;
- diagnostic sans secret ;
- `android:allowBackup="false"`.

La sauvegarde système Android est désactivée parce que Holophone dispose de sa sauvegarde explicite.

Le réglage `allowBackup=false` est imposé dans le manifeste courant et par les scripts de préparation.

Le déverrouillage biométrique doit jouer le splash comme le PIN manuel.

---

# F. Workflow de release 3.0

Le principe historique « version Android toujours manuelle » est remplacé à partir de 3.0 par une automatisation **contrôlée et réversible**.

Point d'entrée conseillé :

```text
RELEASE_3.0.0.cmd
```

Équivalent :

```text
RELEASE.cmd 3.0.0 41
```

Le script :

1. vérifie que `APPV` vaut 3.0.0 ;
2. vérifie que V2 vaut 3.0.0 ;
3. lance la recette statique ;
4. sauvegarde `android/app/build.gradle` ;
5. exige exactement un `versionCode` et un `versionName` ;
6. édite les lignes par position, sans `$1` ;
7. écrit en UTF-8 sans BOM ;
8. restaure le patch `SoundResolver.kt` ;
9. exécute `cap sync android` ;
10. exécute la préparation Android ;
11. relance la recette ;
12. ouvre Android Studio ;
13. restaure `build.gradle` si une étape échoue.

La signature APK reste volontairement faite dans Android Studio avec :

```text
signing\lumen-release.jks
```

Ne jamais recréer le keystore.

Fallback manuel possible :

```gradle
versionCode 41
versionName "3.0.0"
```

puis :

```text
02_PREPARER_ANDROID_STUDIO.cmd
```

---

# G. PowerShell / BOM

Cible : Windows PowerShell 5.1.

Toujours éviter comme variables personnalisées :

```text
$HOME / $Home
$Host
$PID
$PWD
$PSHome
$Args
$Input
$Matches
```

Ne pas réintroduire `Set-Content -Encoding UTF8` sur les fichiers Gradle sous PowerShell 5.1.

Utiliser :

```powershell
[IO.File]::WriteAllText($Path,$Text,(New-Object System.Text.UTF8Encoding($false)))
```

Le vieux bug `$133` provenait d'un remplacement regex ambigu. Le workflow 3.0 n'utilise plus cette stratégie.

---

# H. Recette automatique 3.0

Point d'entrée :

```text
TESTER_STABLE_3.0.0.cmd
```

Dernière validation de construction du patch :

```text
25/25 contrôles statiques OK
npx/cap sync Android OK
```

Le build Gradle complet n'a pas pu être exécuté dans l'environnement de fabrication du patch : le wrapper tente de télécharger `gradle-8.14.3-all.zip` et le conteneur n'a pas de réseau. L'échec observé est `UnknownHostException` avant compilation.

Une recette réelle sur téléphone reste obligatoire avant de considérer la 3.0.0 comme définitivement validée sur appareil.

---

# I. Règles de non-régression 3.0

En plus de toutes les règles métier 2.9 consolidées plus bas :

- ne pas contourner `HolophoneStability.start(boot)` ;
- ne pas abaisser `schemaVersion` ;
- toute nouvelle migration doit être idempotente ;
- ne pas supprimer le checksum des nouvelles sauvegardes ;
- ne pas supprimer le rollback de restauration ;
- ne pas remettre `allowBackup=true` ;
- ne pas remettre `Set-Content -Encoding UTF8` pour Gradle ;
- ne pas remettre un remplacement regex `$1` pour versionCode ;
- maintenir la recette statique à chaque évolution ;
- pendant le Lot 1, ne pas modifier volontairement Judy.

---

# J. Passage au Lot 2

Le Lot 2 pourra commencer une fois la 3.0.0 testée sur téléphone.

Objectif prévu : faire évoluer Judy — humeur plus profonde, activité, vie hors conversation, initiatives motivées, présence visuelle, mémoire plus humaine, temps logique et relation évolutive — sans mélanger ces changements avec la stabilisation technique.

---

# K. CONSOLIDATION MÉTIER ET HISTORIQUE 2.9.0

La suite est le document maître 2.9.0 d'origine. Il reste la référence détaillée pour les moteurs métier, avec les overrides 3.0 ci-dessus.

# HOLOPHONE — DOCUMENT MAÎTRE DE PASSATION

**Référence consolidée : Holophone 2.9.0 — correctif import MP3 inclus**  
**Android : `versionName "2.9.0"` / `versionCode 40`**  
**Package historique conservé : `com.mudva.lumen`**  
**Objet : transmettre l’état complet du projet à une nouvelle conversation sans relire tous les anciens `.md`.**

---

## 0. Comment utiliser ce document dans une nouvelle conversation

Ce fichier doit être considéré comme la **référence de continuité du projet**.

Pour reprendre le développement :

1. fournir ce document ;
2. fournir le dernier projet source complet ou le dernier patch effectivement installé ;
3. préciser la version actuellement installée sur le téléphone ;
4. poursuivre les évolutions sans réintroduire les comportements signalés comme obsolètes ou corrigés ici.

### Règle de priorité documentaire

En cas de contradiction avec un ancien document :

1. le comportement de la **2.9.0 corrigée MP3** prévaut ;
2. puis la version la plus récente concernée ;
3. les anciens documents servent uniquement à comprendre l’historique et les migrations.

Ce document synthétise les fichiers `ARCHITECTURE_*`, `CHANGEMENTS_*`, `RELEASE_*`, `VALIDATION_*`, audits de sécurité, correctifs Android/Gradle, spécification clavier et workflow de release fournis avec le projet jusqu’à la 2.9.0.

---

# 1. Identité du projet

## 1.1 Nom visible

L’application s’appelle **Holophone**.

Le projet était historiquement nommé **Lumen**. Les références Lumen encore présentes dans le package, certains chemins, le keystore ou des schémas historiques sont conservées uniquement pour la compatibilité Android et les migrations.

## 1.2 Package Android

```text
com.mudva.lumen
```

Ce package ne doit pas être renommé sans raison majeure : il sert à conserver la continuité de mise à jour de l’application signée.

## 1.3 Répertoire de travail recommandé

Sous Windows :

```text
%USERPROFILE%\Desktop\Holophone
```

Le projet a été conçu autour de ce workflow.

## 1.4 Signature Android

Le keystore est critique :

```text
signing\lumen-release.jks
```

Une fois la nouvelle chaîne de signature créée, **ne jamais recréer la clé** pour les versions futures sous peine de ne plus pouvoir mettre à jour l’application installée.

Ne jamais publier le keystore ni son mot de passe.

---

# 2. Architecture générale

## 2.1 Couche Web historique

Le cœur de l’application reste principalement :

```text
www/index.html
```

Il contient encore une grande partie de :

- navigation ;
- conversations ;
- écrans ;
- stockage ;
- humeur ;
- galerie ;
- Spotify ;
- initiative ;
- clavier Holophone ;
- Braindance ;
- Refuge ;
- réglages.

Le projet est donc encore partiellement monolithique.

## 2.2 Couche V2

```text
www/js/holophone-v2.js
www/css/holophone-v2.css
```

Ces fichiers regroupent progressivement les briques ajoutées depuis la 2.0 :

- télémétrie ;
- mémoire moderne ;
- anti-répétition ;
- chronologie ;
- goûts structurés ;
- activité autonome ;
- snapshots ;
- stockage avancé ;
- éléments natifs / diagnostics ;
- moteur de thèmes 2.9.0.

Le but est de sortir progressivement du gros `index.html` sans casser l’application.

## 2.3 Plugins Capacitor actuellement utilisés

Les validations 2.9.0 retrouvent :

```text
@capacitor/app@8.1.1
@capacitor/filesystem@8.1.3
@capacitor/keyboard@8.0.5
@capacitor/local-notifications@8.3.1
@mindlib-capacitor/send-intent@8.0.6
```

Le projet contient aussi des plugins natifs locaux / intégrations dédiées pour les fonctions Holophone, notamment :

- DeviceStats ;
- capture vocale ;
- secure storage Android/Keystore ;
- routage audio ;
- correctif de résolution des sons de notification.

---

# 3. Workflow de release Android

## 3.1 Principe actuel

Le workflow automatisé complet historique a été abandonné au profit d’un processus plus fiable :

1. appliquer le patch de la version ;
2. modifier manuellement `android/app/build.gradle` ;
3. lancer `02_PREPARER_ANDROID_STUDIO.cmd` ;
4. générer l’APK signé depuis Android Studio.

Pour **2.9.0** :

```gradle
versionCode 40
versionName "2.9.0"
```

## 3.2 Le CMD principal ne doit PAS modifier automatiquement la version

Un ancien script 2.8.3 a pu transformer :

```text
versionCode 33
```

en :

```text
$133
```

Le principe actuel est donc volontaire : **versionCode / versionName restent manuels** dans `android/app/build.gradle`.

## 3.3 Préparation Android Studio

Lancer :

```text
02_PREPARER_ANDROID_STUDIO.cmd
```

Ce script :

- restaure si nécessaire les correctifs natifs maintenus par Holophone ;
- exécute `npx cap sync android` ;
- prépare Android ;
- ouvre Android Studio.

## 3.4 Génération signée

Dans Android Studio :

```text
Build > Generate Signed App Bundle or APK...
APK
variant : release
```

Utiliser le keystore existant :

```text
signing\lumen-release.jks
```

Installer ensuite l’APK par-dessus la version précédente pour préserver les données.

## 3.5 Java / Gradle

Le projet doit utiliser **JDK 21 LTS** pour Gradle.

Ne pas faire tourner la chaîne actuelle sous Java 25 : l’erreur historique est :

```text
Unsupported class file major version 69
```

Gradle 8.14.x n’est pas la bonne chaîne d’exécution pour Java 25 dans cette configuration.

Le projet contient des outils de détection / correction Java 21.

## 3.6 Pièges Gradle connus

### BOM UTF-8

Erreur historique :

```text
Unexpected character: '﻿' @ line 1, column 1
```

Cause : BOM UTF-8 dans un fichier Gradle/properties, notamment `variables.gradle`.

Ne pas réintroduire de BOM dans :

- `*.gradle` ;
- `*.gradle.kts` ;
- `*.properties`.

### `MainActivity.onResume()`

La surcharge doit rester `public` si elle surcharge `BridgeActivity.onResume()`.

### BiometricPrompt

Utiliser :

```java
android.hardware.biometrics.BiometricPrompt
```

et non :

```java
android.app.BiometricPrompt
```

La constante native :

```text
BIOMETRIC_ERROR_NEGATIVE_BUTTON
```

n’existe pas dans cette API et ne doit pas être réintroduite.

---

# 4. Version actuelle — état 2.9.0

La 2.9.0 est une évolution majeure d’interface bâtie au-dessus de la 2.8.9.

Elle comprend également le **correctif post-assemblage de l’import MP3 Android**.

## 4.1 Correctif MP3 à considérer comme partie intégrante de la 2.9.0

Le bug venait du fait que la `FileList` du sélecteur Android/WebView était conservée par référence puis que l’`input` était vidé avant traitement.

Comportement erroné :

```js
const files = e.target.files;
e.target.value = '';
```

Correction obligatoire :

```js
const files = Array.from((e.target && e.target.files) || []);
if (e.target) e.target.value = '';
```

Conséquences attendues :

- import d’un MP3 fonctionnel ;
- import multiple fonctionnel ;
- réimport du même fichier ultérieurement possible ;
- message d’état indiquant le nombre de fichiers importés.

Une nouvelle conversation ne doit pas repartir d’une archive 2.9.0 antérieure à ce correctif.

---

# 5. Interface — moteur de thèmes 2.9.0

## 5.1 Réglage

Chemin :

```text
Réglages > Application > Apparence
```

Cinq palettes :

1. **Holophone Original** ;
2. **Wallace Gold** ;
3. **Red & Blue Neon** ;
4. **Blue-Green Neon** ;
5. **Full Neon Red**.

## 5.2 Holophone Original

C’est le thème historique multicolore.

Il conserve les couleurs fonctionnelles déjà en place.

## 5.3 Quatre nouveaux thèmes uniformisés

Pour les nouveaux thèmes, la couleur **ne distingue plus les fonctions**.

Exemples :

- Appel / Messages / Réglages : même signature colorée ;
- utilisateur / personnage : même logique de palette ;
- Interactions / Refuge / Braindance : uniformisés ;
- clavier Holophone : palette globale ;
- boutons, sliders, cases, panneaux, jauges : palette globale.

La distinction reste assurée par :

- icônes ;
- formes ;
- libellés ;
- position ;
- opacité ;
- luminosité.

## 5.4 Médias non recolorés

Ne jamais appliquer le thème visuel aux contenus eux-mêmes :

- avatars ;
- photos ;
- vidéos ;
- pochettes Spotify ;
- images générées ;
- médias Braindance / Refuge.

Le splash screen possède également son propre style indépendant.

## 5.5 Aperçu

Le choix d’une palette donne un aperçu immédiat.

- `Enregistrer` : persiste le thème ;
- `Annuler l’aperçu` : restaure le thème enregistré ;
- croix / Retour Android : restaurent aussi le thème enregistré si l’aperçu n’a pas été confirmé.

## 5.6 Persistance

Le thème est enregistré dans :

```text
v7.theme.ui
```

Une ancienne installation sans propriété `ui` migre vers :

```text
original
```

---

# 6. Page d’accueil et identité visuelle

Le design historique Holophone repose sur :

- fond sombre / noir ;
- cadre intérieur néon ;
- ambiance cyberpunk ;
- avatar du personnage ;
- identité / humeur / disponibilité ;
- boutons Appel / Message / Réglages ;
- bouton d’extinction avec confirmation.

En thème Original, la différenciation fonctionnelle historique reste présente.

L’en-tête de conversation affiche le **prénom uniquement**.

Le bandeau de performances affiche en haut à gauche :

```text
Holophone v2.9.0
```

et conserve les jauges CPU / RAM à droite.

---

# 7. Splash screen / démarrage

## 7.1 Principe

Holophone possède un splash audiovisuel **Holophone Industry** au démarrage.

Il ne doit jamais révéler un écran métier avant un éventuel verrouillage PIN.

## 7.2 Styles disponibles

Chemin :

```text
Réglages > Application > Démarrage & sons
```

Styles :

- Classique 2.8.7 ;
- Wallace / Joi ;
- Minimaliste ;
- Cyberpunk.

Le style choisi persiste après redémarrage.

## 7.3 Durée du splash

Le splash doit durer **exactement le temps du jingle sélectionné** autant que le lecteur peut déterminer la fin réelle du MP3.

Principe :

1. démarrer la lecture ;
2. attendre l’événement de fin réel ;
3. retirer le splash ;
4. en cas d’échec audio, utiliser un délai de secours pour ne jamais bloquer l’application.

Un morceau long produit donc volontairement un splash long.

## 7.4 Verrouillage

Si le PIN est actif :

1. écran de code en premier ;
2. déverrouillage ;
3. splash ;
4. écran métier.

---

# 8. Bibliothèque audio commune

Depuis la 2.8.9, les MP3 ne sont plus un simple jingle unique : ils forment une **bibliothèque audio commune**.

Fonctions :

- importer plusieurs MP3 ;
- conserver plusieurs morceaux ;
- sélectionner indépendamment :
  - le jingle du splash ;
  - le son de notification ;
- utiliser le même morceau pour les deux ;
- supprimer un MP3 ;
- tester le splash ;
- tester une notification.

Le jingle intégré `joi_startup.mp3` reste disponible.

Le son système Android reste un choix possible pour les notifications.

Le fichier importé est copié dans le stockage privé de Holophone, pas seulement référencé par URI externe.

Règles historiques d’import :

- MP3 ;
- non vide ;
- maximum 40 Mo ;
- durée lisible.

La sauvegarde complète avec médias doit inclure la bibliothèque MP3.

---

# 9. Notifications anonymisées

Les notifications ne doivent révéler :

- ni prénom ;
- ni contenu du message ;
- ni extrait de conversation.

Format cible :

```text
Titre : Holophone
Corps : 1 nouveau message
```

ou :

```text
Titre : Holophone
Corps : X nouveaux messages
```

Au passage 2.8.9, les anciennes notifications déjà planifiées sont annulées afin d’éviter la réapparition d’un ancien contenu non anonymisé.

## 9.1 Sons Android

Sur Android 8+, le son est lié au canal de notification et devient difficile à modifier après création.

Holophone utilise donc un **canal distinct par MP3**.

Les MP3 importés sont copiés dans un emplacement privé exploitable par Android pour les notifications.

Le résolveur du plugin local-notifications a été adapté pour accepter :

- les sons web intégrés ;
- `media/joi_startup.mp3` ;
- les MP3 importés dans le répertoire natif dédié.

Une copie canonique du correctif est conservée dans :

```text
scripts/patches/local-notifications/SoundResolver.kt
```

Le script `02_PREPARER_ANDROID_STUDIO.cmd` doit recopier ce correctif avant le `cap sync` afin qu’un futur `npm install` ne l’efface pas silencieusement.

---

# 10. Verrouillage, confidentialité et sécurité

## 10.1 Protection écran / multitâche

Le projet a été durci pour éviter l’aperçu de l’application dans les applications récentes :

- API 33+ : désactivation de la capture récente ;
- versions plus anciennes : `FLAG_SECURE` en repli.

## 10.2 Préboot

Le DOM démarre avec les écrans métier masqués.

Le PIN est relu **avant** contacts / conversations / écrans.

Aucun écran de conversation ne doit flasher avant le verrouillage.

## 10.3 Retour d’arrière-plan

Depuis 2.8.3 :

- si Holophone passe réellement en arrière-plan avec code actif, le prochain retour demande le code ;
- les sélecteurs de fichier, retours Spotify et partages entrants reconnus sont traités comme flux de confiance pour éviter un verrou intempestif.

## 10.4 Secrets

Depuis la 2.0, Android Keystore / SecureStore est utilisé pour migrer et protéger notamment :

- clés IA ;
- réglages / clés voix sensibles ;
- clé de génération/recherche d’image si applicable ;
- tokens Spotify ;
- PIN.

Les anciennes valeurs trouvées dans le stockage Web sont migrées puis supprimées du stockage en clair.

La biométrie Android est facultative ; le PIN reste un secours.

## 10.5 Diagnostics

Les diagnostics ne doivent jamais exporter :

- clés API ;
- tokens ;
- PIN ;
- mot de passe du keystore.

## 10.6 Risques / recommandations historiques à garder en tête

Les anciens audits signalaient :

- CSP absente ;
- Google Fonts externe ;
- endpoint HTTP personnalisé risqué hors LAN de confiance ;
- sauvegardes avec secrets potentiellement sensibles si l’utilisateur choisit explicitement de les inclure ;
- nécessité de limiter Android Backup.

Une partie des risques de stockage local en clair a ensuite été traitée par SecureStore 2.0, mais les principes de prudence restent valables.

---

# 11. Conversations — fonctionnement général

## 11.1 Réponse ciblée

Un appui long sur un message permet de répondre précisément à :

- texte ;
- photo ;
- musique ;
- vidéo.

La référence est conservée dans la conversation et dans les exports.

## 11.2 Régénérer / Annuler

`Régénérer` et `Annuler l’échange` demandent confirmation avant modification du dernier échange.

Avec Gemini Interactions, Holophone conserve une pile locale permettant de rembobiner le parent serveur correspondant.

## 11.3 Salves utilisateur

Holophone attend une courte fenêtre avant de lancer la réponse afin de permettre plusieurs messages successifs.

La règle moderne : **la saisie elle-même repousse le délai** lorsqu’un tour est déjà planifié.

Pris en charge :

- clavier Android ;
- clavier Holophone ;
- IME / composition ;
- collage.

Important : taper sans tour en attente ne déclenche jamais Judy.

## 11.4 Bouton “Réessayer d’envoyer”

Le flag d’échec doit être effacé dès qu’une nouvelle tentative commence.

Il ne doit pas rester accroché après :

- nouveau message ;
- nouvel appel IA ;
- nouvelle réponse ;
- initiative reçue.

## 11.5 Navigation conversation

Depuis 2.8.3, une navigation flottante permet de sauter vers le bloc précédent / suivant dans les longues conversations.

---

# 12. Gemini — moteur principal de conversation

## 12.1 API principale

Les conversations Gemini utilisent l’API **Interactions** stateful :

```text
POST https://generativelanguage.googleapis.com/v1/interactions
```

Principe :

```text
message
  -> interaction_id
  -> previous_interaction_id
  -> message suivant
```

Holophone n’envoie donc pas tout l’historique à chaque tour.

## 12.2 Données de conversation

État local typique :

- `geminiInteractionId` ;
- `geminiAiCursor` ;
- `geminiTurns[]` ;
- `geminiModel` ;
- `geminiUpdatedAt`.

## 12.3 `safety_settings`

**Ne pas envoyer `safety_settings` à `/v1/interactions`.**

Cette API les a rejetés dans les versions 2.1 initiales.

Les réglages de sécurité peuvent encore être utilisés sur les appels `generateContent` qui les supportent.

## 12.4 Format `input`

Conversation texte simple :

```json
"input": "texte utilisateur"
```

Entrée multimodale : utiliser un `user_input` explicite contenant les blocs texte/image.

Ne pas réintroduire l’ancienne structure invalide :

```json
{"type":"text","text":"..."}
```

comme élément direct du tableau `input` Interactions.

## 12.5 Expiration / rotation

Si `previous_interaction_id` est expiré / refusé :

1. abandonner l’ancien ID ;
2. reprendre une petite portion locale brute ;
3. injecter la mémoire durable pertinente ;
4. créer une nouvelle Interaction ;
5. continuer normalement.

Les rotations peuvent aussi être déclenchées préventivement pour :

- gros ancien fil ;
- contexte trop lourd ;
- TTL d’images.

La rotation doit rester invisible pour l’utilisateur.

---

# 13. Mémoire longue — philosophie actuelle

## 13.1 Source de vérité

Principe fondamental : **les conversations locales brutes sont la vérité**.

L’IA ne doit pas réécrire une deuxième biographie “officielle” à partir des échanges.

## 13.2 Mémoire active

Gemini Interactions porte la continuité immédiate du fil tant que l’Interaction ID reste valide.

## 13.3 Mémoire autobiographique durable

Holophone conserve des épisodes sourcés localement.

Un épisode mémorise des sources exactes :

```text
auteur
timestamp
texte exact
importance
tags
```

Pas de résumé narratif IA stocké comme vérité.

## 13.4 Plus d’IA de fond pour classer la mémoire

Depuis 2.2.1 :

```text
longMemory.mode = local-source-only
longMemory.backgroundAiCalls = 0
```

La sélection se fait localement avec des signaux :

- densité / longueur ;
- famille ;
- couple ;
- maison ;
- travail ;
- santé ;
- décisions durables ;
- identité ;
- projets ;
- changements de vie ;
- événements émotionnels ;
- auto-définition du personnage.

## 13.5 Judy peut évoluer sans que son socle soit réécrit

Une phrase où le personnage se définit lui-même peut être archivée mot pour mot.

Exemple conceptuel :

```text
Judy : « ... »
```

Elle ne devient pas automatiquement une nouvelle règle de personnalité.

Le socle reste sous contrôle utilisateur.

## 13.6 Segmentation

Depuis 2.2.2 :

- petites fenêtres ancrées autour de messages-noyaux ;
- sélection de noyaux espacés ;
- priorité spéciale aux auto-définitions ;
- fusion uniquement si au moins deux messages sources sont partagés ;
- épisode final limité à 12 messages lors de la fusion stricte.

## 13.7 Injection lors d’une nouvelle chaîne

Une nouvelle Interaction peut recevoir :

1. prompt système ;
2. épisodes importants ;
3. derniers messages bruts ;
4. nouveau message.

Le tout doit rester plafonné pour éviter de reconstruire un prompt géant.

## 13.8 Reset d’esprit

`Réinitialiser l’esprit` efface les éléments appris / épisodiques mais doit préserver les éléments de base définis par l’utilisateur tels que l’identité, la personnalité de socle, l’apparence et les médias selon la logique de la fonction.

Les conversations archivées ne sont pas nécessairement supprimées.

---

# 14. Contexte visuel / images

## 14.1 Persistance

Les médias binaires sont stockés via IndexedDB avec un format robuste (`ArrayBuffer`, type MIME, taille), puis reconstruits en Blob à la lecture.

## 14.2 Anti-répétition historique

Une même image envoyée par le personnage est bloquée pendant 12 h, selon identifiant binaire / URL stable / libellé de secours.

## 14.3 TTL dans le contexte Gemini

Depuis 2.7.1, les pixels envoyés au contexte IA ne doivent pas rester éternellement dans la chaîne serveur.

Réglage :

```text
Réglages > Mémoire > Durée des images dans le contexte IA
```

Valeurs historiques :

- 1 h ;
- 2 h recommandé ;
- 4 h ;
- 8 h ;
- désactivé.

Quand le TTL est dépassé :

- rotation silencieuse Interaction ;
- reprise textuelle / mémoire ;
- anciennes données pixel non réinjectées.

Le média visible / IndexedDB / galerie n’est pas supprimé.

---

# 15. Interactions physiques

Anciennement nommées **Actions**, elles sont désormais appelées **Interactions** dans l’interface.

## 15.1 Configuration

Chaque interaction possède notamment :

- catégorie ;
- libellé ;
- formulation ;
- humeur ;
- intensité ;
- acteur autorisé.

## 15.2 Droit d’utilisation

Champ interne :

```text
actors = character | user | both
```

Affichage utilisateur :

- `[Prénom du personnage]` ;
- `Toi` ;
- `Les deux`.

Le prénom n’est jamais codé en dur.

Migration : toute ancienne interaction sans ce champ devient `both`.

## 15.3 Filtrage réel

- `user` : visible uniquement pour l’utilisateur ;
- `character` : disponible uniquement au personnage ;
- `both` : utilisable des deux côtés.

Le filtrage doit être appliqué :

- dans l’UI ;
- dans le prompt proposé au modèle ;
- dans les réponses alternatives ;
- dans le garde-fou final avant affichage.

## 15.4 Recherche / pliage

Recherche instantanée dans :

- le sélecteur rapide ;
- la configuration.

Recherche sur :

- catégorie ;
- libellé ;
- formulation ;
- humeur ;
- niveau ;
- portée acteur.

Ignorer casse et accents.

Barre flottante :

- Tout plier ;
- Tout déplier.

## 15.5 Judy doit rester parcimonieuse

Depuis 2.7.1 :

- le champ d’action doit rester vide dans la majorité des réponses ;
- pas de miroir automatique de l’action utilisateur ;
- cooldown sur actions de Judy ;
- réponse textuelle seule souvent préférable.

---

# 16. “C’est arrivé”

Fonction d’enregistrement d’un événement réel hors messagerie.

Elle reste mise en avant dans le panneau Interactions afin de distinguer :

- une interaction jouée dans le fil ;
- un événement réellement vécu à inscrire dans l’histoire.

---

# 17. Braindance — architecture actuelle

## 17.1 Moteur séparé du chat

Depuis 2.8.5, Braindance ne doit plus utiliser le même flux brut que la conversation Gemini Interactions.

Endpoint :

```text
POST /v1beta/models/<model>:generateContent
```

Réglages :

```text
thinkingConfig.thinkingLevel = HIGH
safetySettings = BLOCK_NONE sur les catégories configurables
```

Important : `BLOCK_NONE` ne supprime pas les protections de contenu prohibé imposées par Google au niveau du service.

## 17.2 Ne jamais polluer `conv.ai` avec le texte brut Braindance

Les anciens marqueurs :

```text
[BRAINDANCE STUDIO ...]
[BRAINDANCE bloc ...]
```

ont provoqué des refus du chat normal après une Braindance.

État corrigé :

- blocs visibles dans `conv.msgs` ;
- marqués `bd:true` ;
- archivés en Replay ;
- **pas** ajoutés comme gros messages bruts dans `conv.ai` ;
- pont de continuité neutre uniquement.

Les anciens marqueurs bruts doivent être ignorés lors :

- des entrées Interactions ;
- du bootstrap ;
- de la mémoire épisodique ;
- des rappels inter-fils ;
- des historiques de secours.

## 17.3 Continuité entre blocs

Ne pas renvoyer plusieurs milliers de caractères des blocs précédents comme entrée du bloc suivant.

Utiliser une continuité structurelle légère afin d’éviter qu’une sortie acceptée au bloc N devienne une entrée bloquée au bloc N+1.

## 17.4 Paramétrage

Le moteur Braindance reste accessible dans :

```text
Réglages > Conversations > Moteur Braindance
```

Le nombre de blocs se choisit directement dans le composeur Braindance : historique 3 à 6 blocs.

Les âges adultes par défaut et consignes moteur restent centralisés dans le réglage Braindance.

## 17.5 Éléments Braindance

L’ancienne Boutique de jouets n’est plus l’interface courante.

Elle a été remplacée par des listes paramétrables :

- focales ;
- zones ;
- dynamiques / pratiques ;
- mots / intentions.

Les anciennes données de jouets peuvent rester dans les sauvegardes pour compatibilité historique.

---

# 18. Replay Braindance

Chaque Braindance terminée peut être archivée.

Un Replay contient notamment :

- titre ;
- date ;
- protagonistes ;
- contexte ;
- blocs texte ;
- médias intercalés ;
- modèle utilisé.

Le texte intégral est stocké dans IndexedDB.

Tri :

1. meilleure note ;
2. plus récente.

## 18.1 Notes

Notes 1 à 5.

À 4 ou 5 étoiles, une préférence Braindance est ajoutée aux goûts du personnage.

Si la note repasse sous 4, l’entrée correspondante peut être retirée.

## 18.2 Audio ElevenLabs

Les Replay peuvent être lus avec la voix du personnage.

Première lecture :

- appel ElevenLabs ;
- streaming si possible ;
- sauvegarde locale des MP3 par partie / bloc.

Lectures suivantes : cache local.

Stockage Android :

```text
Holophone/BraindanceAudio/<replayId>/...
```

Les caches audio Replay ne sont pas nécessairement inclus dans les sauvegardes JSON ; ils peuvent être recréés.

Navigation audio :

- lire ;
- arrêter ;
- bloc précédent ;
- bloc suivant ;
- supprimer audio local.

---

# 19. Notre Refuge

Le Refuge est un espace construit à deux.

## 19.1 Modifications soumises à accord

Les changements structurants deviennent des propositions :

- nom ;
- localisation ;
- climat ;
- météo ;
- ambiance ;
- création / modification / suppression d’une pièce ;
- médias associés à une pièce.

La modification n’est appliquée que si la décision technique du personnage est explicite.

## 19.2 Décision structurée

Champs :

```text
refugeDecisionId
refugeDecision = accept | refuse
```

Une réparation conservatrice peut reconnaître un accord/refus textuel explicite si le modèle oublie exceptionnellement le champ.

## 19.3 Propositions de Judy

Le personnage peut proposer une pièce avec des champs structurés.

La proposition n’est pas construite automatiquement.

L’utilisateur choisit :

- Accepter ;
- Refuser.

## 19.4 Bug d’identité objet corrigé

Ne pas réintroduire une normalisation qui recrée les objets de proposition par `.map({...})` à chaque passage.

Cela avait créé l’état incohérent : pièce construite mais proposition toujours `pending`.

La normalisation moderne doit préserver l’identité canonique des objets et re-résoudre par ID.

---

# 20. Spotify / musique

Fonctions historiques importantes :

- recherche Spotify ;
- partage de morceau ;
- message facultatif accompagnant un morceau ;
- réaction du personnage ;
- goûts musicaux structurés ;
- anti-répétition sur les musiques ;
- deep link moderne :

```text
holophone://spotify/callback
```

Les anciens schémas peuvent être gardés uniquement pour compatibilité.

Le moteur doit éviter les échos / répétitions de musique récemment envoyée.

---

# 21. Goûts

Les goûts structurés peuvent contenir :

- intensité 1 à 5 ;
- confiance ;
- origine ;
- première apparition ;
- dernière confirmation ;
- raison / association.

Pour la musique, le modèle peut indiquer un signal de goût structuré associé au morceau exact.

Les Braindances notées 4–5 peuvent également alimenter les goûts.

---

# 22. Humeur et activité autonome

Le personnage possède :

- humeur ;
- intensité ;
- activité actuelle ;
- début ;
- fin prévue ;
- prochaine activité probable.

Les plages Travail / Sommeil restent prioritaires.

Dans les thèmes 2.9.0 non-Originaux, les indicateurs d’humeur doivent employer l’accent global du thème plutôt que réintroduire la palette historique par famille.

---

# 23. Initiative du personnage

Holophone peut préparer des initiatives / notifications.

Si Initiative est désactivée, il faut immédiatement :

1. annuler les notifications locales planifiées ;
2. purger les `ct.push` persistants ;
3. remettre les prochaines échéances à zéro ;
4. refuser de livrer une ancienne file au redémarrage.

Ce correctif a été introduit pour éviter qu’une notification arrive malgré une Initiative désactivée.

---

# 24. Appel vocal

Le mode appel utilise l’IA texte + synthèse vocale ElevenLabs.

Fonctions V2 documentées :

- durée ;
- vu-mètre micro ;
- Son / Muet ;
- choix sortie audio ;
- haut-parleur ;
- écouteur ;
- Bluetooth si proposé ;
- casque filaire / USB ;
- interruption du personnage pendant sa voix ;
- mode mains libres expérimental.

Le mode mains libres reste séquentiel afin d’éviter que le micro retranscrive la voix ElevenLabs par écho.

---

# 25. Clavier Holophone

## 25.1 Réglage

```text
Réglages > Clavier
```

Choix :

- Android ;
- Holophone.

Persisté dans `v7.theme` avec les migrations nécessaires.

## 25.2 Style historique Original

- fond noir ;
- touches normales cyan / vert néon ;
- touches fonctionnelles rouges ;
- inversion visuelle lors de la pression.

Avec les nouveaux thèmes 2.9.0, le clavier doit suivre la palette globale uniforme.

## 25.3 Fonctionnalités

- AZERTY ;
- Shift simple ;
- double Shift / verrouillage ;
- chiffres ;
- symboles ;
- accents français par appui long ;
- suppression simple / continue ;
- respect sélection / curseur ;
- emojis par catégories ;
- récents persistants ;
- variantes de peau pour certains emojis ;
- touche Envoyer reliée au même mécanisme que le compositeur ;
- retour haptique ;
- Retour Android ferme d’abord le clavier.

## 25.4 Clavier système

En mode Holophone, le clavier Android doit être empêché autant que possible (`inputmode="none"` + plugin Keyboard hide).

En mode Android, restaurer le comportement normal.

---

# 26. Galerie / avatars

## 26.1 Avatars

Les avatars peuvent posséder des réglages persistants :

- X ;
- Y ;
- zoom ;
- humeur associée.

Le zoom historique va jusqu’à environ 240 %.

L’avatar affiché doit suivre l’humeur du personnage.

## 26.2 Galerie

Les images peuvent porter des métadonnées :

- contexte / histoire ;
- personnes ;
- lieu ;
- niveau normal ou privé/sensible ;
- humeur ;
- utilisation ;
- dernière utilisation ;
- cooldown.

Les fichiers image doivent survivre à la fermeture / réouverture via le stockage binaire robuste.

---

# 27. Sous le capot / diagnostic

Le panneau technique est une pièce importante pour le développement.

Il expose notamment :

- prompt système ;
- historique réellement envoyé ;
- réponse brute ;
- réponse interprétée ;
- fournisseur / modèle / latence ;
- erreurs IA ;
- TTS ;
- Spotify ;
- génération image ;
- microphone ;
- Keystore ;
- chronologie ;
- snapshots ;
- état Gemini Interactions ;
- mémoire longue ;
- Braindance.

Tests directs historiques :

- IA ;
- voix ;
- micro ;
- Spotify.

Le diagnostic environnement Windows existe aussi et peut être utilisé pour relever :

- Java ;
- Node/npm/npx ;
- Android Studio ;
- SDK ;
- Gradle ;
- Capacitor ;
- ADB ;
- build-tools.

Il ne doit pas révéler de secrets.

---

# 28. CPU / RAM

Holophone utilise un plugin natif `DeviceStats`.

Le proxy JS doit être correctement enregistré avec Capacitor.

L’interface affiche les valeurs du processus Holophone, pas un monitoring général du téléphone.

En cas d’échec, le dernier message du plugin doit pouvoir apparaître dans le diagnostic.

---

# 29. Snapshots et sauvegardes

## 29.1 Snapshots internes

Holophone conserve jusqu’à trois snapshots structurés :

- courant ;
- précédent ;
- ancien.

Ils contiennent les données structurées importantes **sans les secrets**.

Sous le capot peut :

- créer un snapshot ;
- restaurer le dernier.

## 29.2 Exports Android

Les exports doivent être regroupés dans :

```text
Documents/Holophone
```

avec compartimentation par type.

## 29.3 Formats historiques

Les nouveaux formats portent l’identité Holophone :

```text
holophone-fiche
holophone-images
holophone-conv
holophone-backup
```

Les anciens formats peuvent rester acceptés à l’import pour compatibilité.

## 29.4 Sauvegarde avec médias

Les sauvegardes complètes modernes peuvent inclure :

- contacts ;
- conversations ;
- mémoire ;
- goûts ;
- réglages ;
- Replay Braindance ;
- bibliothèque audio ;
- médias selon options.

Le format 2.8.9 est indiqué comme révision 11.

---

# 30. Anti-répétition

Holophone possède plusieurs protections :

- images réutilisées trop tôt ;
- musiques réutilisées trop tôt ;
- formulations presque identiques ;
- questions répétées ;
- compliments répétés ;
- anecdotes répétées ;
- actions physiques miroir / trop fréquentes.

Si une réponse de Judy ressemble fortement à une réponse récente, Holophone peut demander une seconde formulation qui fait avancer la situation.

---

# 31. Temps logique

Le moteur conversationnel doit garder un temps cohérent.

Les échanges sont horodatés avec :

- jour ;
- date ;
- heure ;
- partie de journée ;
- fuseau local ;
- durée d’un silence significatif.

Le modèle doit considérer ces horodatages comme des faits et ne pas perdre la notion des nuits / changements de jour.

---

# 32. Écrans Réglages — organisation moderne

Organisation introduite en 2.8.3 puis enrichie :

## Personnage

- Identité ;
- Personnalité ;
- Humeurs ;
- Mémoire ;
- Goûts ;
- Profondeur ;
- Initiative ;
- Avatars ;
- Galerie ;
- Vidéos & musique ;
- Toi.

## Services & API

- Moteur IA ;
- Voix ;
- Spotify ;
- Images générées.

## Conversations

- Interactions ;
- Éléments Braindance ;
- Moteur Braindance ;
- Replay Braindance.

## Application

- Import / Export ;
- Sauvegarde ;
- Clavier ;
- Apparence ;
- Démarrage & sons ;
- Verrouillage ;
- Sous le capot ;
- À propos.

Le menu doit rester scrollable lorsque plusieurs catégories sont dépliées, avec commandes de pliage sticky lorsque prévu.

---

# 33. Règles de non-régression prioritaires

Une évolution future doit au minimum préserver les points suivants.

## Conversation / Gemini

- ne pas remettre l’historique complet à chaque tour Gemini Interactions ;
- ne pas envoyer `safety_settings` à `/v1/interactions` ;
- ne pas réinjecter les blocs Braindance bruts dans le chat ;
- ne pas transformer la mémoire longue en résumé IA non sourcé ;
- conserver la rotation silencieuse des Interaction IDs ;
- conserver le TTL image dans le contexte IA.

## Braindance

- moteur séparé `generateContent` ;
- réflexion élevée ;
- texte brut exclu de `conv.ai` ;
- Replay conservé ;
- audio local ElevenLabs conservé.

## Refuge

- propositions canonisées par ID ;
- ne pas recréer les objets de manière à laisser des `pending` fantômes ;
- propositions de Judy soumises à décision utilisateur.

## Interactions

- acteurs autorisés respectés côté UI **et** moteur ;
- recherche ;
- Tout plier / Tout déplier ;
- personnage non codé en dur ;
- fréquence raisonnable ;
- anti-miroir.

## Vie privée

- notification anonymisée ;
- aucun écran métier avant PIN ;
- aperçu Android protégé ;
- diagnostic sans secret ;
- secrets dans SecureStore Android lorsque disponible.

## Interface

- Original reste historique multicolore ;
- nouveaux thèmes uniformisés ;
- médias jamais recolorés ;
- splash indépendant du thème ;
- splash synchronisé sur la durée réelle de l’audio.

## Audio

- bibliothèque MP3 commune ;
- import multi-fichier avec `Array.from(...)` avant reset du champ ;
- correctif `SoundResolver.kt` réappliqué avant `cap sync` ;
- canal Android distinct par son importé.

## Release

- version Android modifiée manuellement ;
- ne pas remettre le script regex qui a créé `$133` ;
- JDK 21 ;
- ne pas recréer le keystore.

---

# 34. Validation connue de la 2.9.0

Les documents fournis indiquent :

- syntaxe JS inline `index.html` : OK ;
- syntaxe `www/js/holophone-v2.js` : OK ;
- structure CSS : OK ;
- cinq thèmes présents ;
- migration vers `original` si absence de réglage UI : OK ;
- logique aperçu / enregistrer / annuler contrôlée ;
- `npx cap sync android` : OK ;
- 5 plugins Capacitor détectés ;
- assets Android synchronisés en 2.9.0 ;
- correctif MP3 post-assemblage : resynchronisé et syntaxiquement validé.

## Limite de validation automatisée

La compilation `assembleDebug` n’a pas pu aller jusqu’à la compilation dans l’environnement de validation car Gradle tentait de télécharger :

```text
https://services.gradle.org/distributions/gradle-8.14.3-all.zip
```

et l’environnement n’avait pas d’accès réseau.

L’échec était donc un `UnknownHostException` avant compilation des sources Android.

La validation finale de référence reste le téléphone réel pour :

- rendu des thèmes ;
- halos ;
- son de notification MP3 ;
- import multiple de MP3 ;
- splash + durée réelle ;
- comportement PIN ;
- performance clavier / WebView.

---

# 35. Historique de versions utile

Cette liste est principalement utile pour comprendre les migrations / `versionCode`.

| Version | versionCode | Jalons principaux |
|---|---:|---|
| 1.1 | 2 | sécurité / préboot / aperçu Android |
| 1.2 | 3 | renommage / continuité Holophone |
| 1.3 | 4 | nouvel accueil / cadre / Braindance initiale |
| 1.6 | 7 | réponses ciblées / Spotify message / anti-répétition média |
| 1.7 | 8 | CPU/RAM / purge initiative / UI |
| 1.8 | 9 | clavier Holophone |
| 2.0 | 11 | V2 / Keystore / snapshots / appel / mémoire structurée |
| 2.0.1 | 12 | moteur de contexte / reset esprit |
| 2.1 | 13 | Gemini Interactions |
| 2.1.1 | 14 | suppression safety_settings Interactions |
| 2.1.2 | 15 | correction input Interactions |
| 2.2 | 16 | mémoire épisodique sourcée |
| 2.2.1 | 17 | mémoire locale sans IA de fond |
| 2.2.2 | 18 | segmentation mémoire stricte |
| 2.5 | 21 | Replay Braindance |
| 2.6.1 | 23 | Refuge à deux |
| 2.6.3 | 25 | UI notifications / C’est arrivé |
| 2.7.1 | 27 | TTL image / Refuge fiable / actions rares |
| 2.7.3 | 29 | saisie repousse salve / correction Refuge |
| 2.8 | 30 | audio local Replay Braindance |
| 2.8.1 | 31 | navigation audio par bloc |
| 2.8.2 | 32 | audio flottant / Refuge front |
| 2.8.3 | 33 | rangement réglages / navigation / verrouillage |
| 2.8.4 | 34 | réglages scrollables / moteur Braindance restauré |
| 2.8.5 | 35 | séparation Braindance / Interactions |
| 2.8.6 | 36 | permissions Interactions / recherche / pliage |
| 2.8.7 | 37 | splash Holophone Industry |
| 2.8.8 | 38 | splash configurable / jingle MP3 / version CPU bar |
| 2.8.9 | 39 | notifications anonymes / bibliothèque audio commune |
| **2.9.0** | **40** | **moteur global de thèmes + correctif import MP3** |

Certains numéros intermédiaires existent historiquement sans `.md` dédié dans le lot fourni ; la table ci-dessus ne prétend pas reconstituer un changelog absent.

---

# 36. Conventions de travail Windows à conserver

## PowerShell

Cible historique : Windows PowerShell 5.1.

Éviter comme variables personnalisées les variables automatiques / réservées :

```text
$HOME / $Home
$Host
$PID
$PWD
$PSHome
$Args
$Input
$Matches
```

PowerShell étant insensible à la casse, `$Home` et `$HOME` sont la même variable automatique.

Dans les conditions complexes, parenthéser les appels cmdlets :

```powershell
if ((Test-Path $gradlew) -and (...)) { ... }
```

## `%~dp0`

Éviter de passer directement `%~dp0` comme argument quoted à `powershell.exe` lorsque le slash final peut perturber le parsing.

Préférer :

```cmd
cd /d "%~dp0"
```

puis `%CD%`, ou laisser le `.ps1` déterminer sa racine avec :

```powershell
Split-Path -Parent $PSScriptRoot
```

---

# 37. Ce qui est historique / obsolète

Ne pas prendre comme architecture actuelle les éléments suivants lorsqu’un document ancien les mentionne :

- **Lumen** comme nom visible : obsolète ;
- génération complète APK uniquement par PowerShell : remplacée par Android Studio ;
- mémoire IA qui résume / réécrit la conversation : abandonnée ;
- classificateur mémoire réseau Gemini en arrière-plan : supprimé ;
- `safety_settings` sur `/v1/interactions` : interdit ;
- Braindance brute dans la chaîne conversationnelle : corrigé ;
- Boutique de jouets comme écran Braindance principal : remplacée par Éléments Braindance ;
- une seule musique personnalisée de démarrage : remplacée par bibliothèque audio ;
- notifications avec prénom / extrait : interdit par la 2.8.9 ;
- modification automatique `versionCode/versionName` par le CMD principal : abandonnée ;
- stockage local Web en clair des secrets Android comme stratégie cible : remplacé par SecureStore/Keystore lorsque disponible.

---

# 38. Points à surveiller dans les prochaines évolutions

Ces points ne sont pas forcément des bugs ouverts ; ce sont des zones sensibles documentées qui méritent des tests systématiques :

- build Android réel après modification d’un plugin natif ;
- résilience du correctif `SoundResolver.kt` après `npm install` ;
- canaux Android et sons importés ;
- stockage / restauration des MP3 ;
- taille d’IndexedDB avec médias ;
- rotation des Interaction IDs ;
- absence de remontée Braindance brute dans le chat ;
- longueur des prompts Gemini ;
- TTL des images ;
- cohérence Refuge ;
- fréquence des Interactions Judy ;
- affichage thème sur toutes les modales et états d’erreur ;
- PIN avant splash ;
- clavier Holophone après changement de thème ;
- snapshots et sauvegarde média ;
- compatibilité des imports historiques.

---

# 39. Recette minimale avant de déclarer une future version stable

## Démarrage

- démarrage sans PIN ;
- démarrage avec PIN ;
- splash choisi ;
- durée = audio ;
- jingle personnalisé ;
- retour écran principal.

## Apparence

Tester les 5 thèmes :

- accueil ;
- conversation ;
- Réglages ;
- Interactions ;
- Braindance ;
- Refuge ;
- clavier ;
- Spotify ;
- sliders / toggles ;
- erreurs / toasts ;
- médias non recolorés.

## Audio

- import 1 MP3 ;
- import multiple ;
- réimport même nom ;
- suppression ;
- sélection splash ;
- sélection notification ;
- son système ;
- notification de test.

## Conversation

- nouveau fil ;
- réponse Gemini Interactions ;
- salve de plusieurs messages ;
- saisie qui repousse le délai ;
- réponse ciblée ;
- régénération ;
- annulation ;
- image ;
- musique ;
- initiative.

## Interactions

- `Toi` ;
- personnage ;
- `Les deux` ;
- recherche ;
- tout plier / déplier ;
- anti-miroir ;
- cadence Judy.

## Mémoire

- épisode durable sourcé ;
- reset esprit ;
- rotation Interaction ;
- TTL image ;
- absence d’appel IA de fond mémoire.

## Braindance

- génération 3–6 blocs ;
- conversation normale après Braindance ;
- Replay ;
- note ;
- audio ElevenLabs ;
- cache bloc ;
- suppression audio.

## Refuge

- proposition utilisateur ;
- acceptation / refus Judy ;
- proposition Judy ;
- acceptation / refus utilisateur ;
- aucune proposition `pending` fantôme.

## Sécurité

- aperçu apps récentes ;
- diagnostic sans secret ;
- partage entrant ;
- retour sélecteur fichier sans verrou parasite ;
- sauvegarde / restauration.

---

# 40. Résumé en une phrase pour la prochaine conversation

**Holophone 2.9.0 est une application Android Capacitor de compagnon conversationnel local-first, avec Gemini Interactions stateful pour le chat, mémoire longue sourcée sans résumé IA de fond, ElevenLabs pour la voix, Spotify, avatars/humeurs, Interactions physiques configurables, Refuge collaboratif, Braindance séparée sur `generateContent` avec Replays et audio local, clavier Holophone, sécurité Android/Keystore, snapshots, notifications anonymisées, bibliothèque MP3 commune, splash Holophone Industry et cinq thèmes globaux — la base courante à reprendre est la 2.9.0 corrigée de l’import MP3 avec `versionCode 40`.**

---

# 41. Inventaire des documents consolidés

Le lot fourni contenait notamment :

- `README.md` ;
- `ARCHITECTURE_2.0.md` ;
- `ARCHITECTURE_INTERACTIONS_2.1.md` ;
- `ARCHITECTURE_MEMOIRE_2.2.md` ;
- `ARCHITECTURE_MEMOIRE_2.2.1.md` ;
- `ARCHITECTURE_MEMOIRE_2.2.2.md` ;
- `MOTEUR_CONTEXTE_2.0.1.md` ;
- `SPEC_Clavier_Holophone.md` ;
- `AUDIT_SECURITE_1.1.md` ;
- `CHECK_SECURITE_1.2.md` ;
- `CHANGEMENTS_*` jusqu’à `CHANGEMENTS_2.9.0.md` ;
- `RELEASE_*` jusqu’à `RELEASE_2.9.0.md` ;
- `VALIDATION_*` jusqu’à `VALIDATION_2.9.0.md` ;
- `README_PATCH_2.8.5.md` à `README_PATCH_2.9.0.md` ;
- correctifs Gradle / Java / MainActivity / biométrie ;
- documents de diagnostic et workflow Android Studio.

Leur contenu utile et encore applicable est consolidé dans ce document. Les répétitions, instructions de transition et correctifs rendus obsolètes par des versions ultérieures ont été volontairement réduits à leur leçon technique utile.

---

**Fin du document maître — Holophone 2.9.0**
