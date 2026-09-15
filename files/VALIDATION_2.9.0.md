# Validation Holophone 2.9.0

## JavaScript

Validation syntaxique Node.js effectuée sur :

- script inline de `www/index.html` : **OK** ;
- `www/js/holophone-v2.js` : **OK**.

## CSS

Contrôle structurel effectué sur `www/css/holophone-v2.css` :

- nombre d'accolades ouvrantes / fermantes identique ;
- cinq thèmes définis ;
- les règles d'uniformisation excluent explicitement `original`.

Le thème historique n'est donc pas soumis aux surcharges des nouveaux thèmes.

## Migration

Contrôle statique :

- `THEME` initialise `ui` à `original` ;
- une ancienne valeur `v7.theme` contenant uniquement le clavier conserve donc automatiquement `original` ;
- une valeur inconnue est ramenée à `original` ;
- le thème est réappliqué au boot et après restauration d'une sauvegarde.

## Aperçu

Contrôle statique :

- sélection d'une carte : aperçu immédiat sans modifier la valeur persistante ;
- `Enregistrer` : copie l'aperçu dans `THEME.ui` puis sauvegarde ;
- annulation / croix : restauration du thème persisté ;
- Retour Android depuis l'écran Apparence : restauration du thème persisté.

## Uniformisation

Les surcharges 2.9.0 couvrent notamment :

- cadre d'écran ;
- accueil ;
- bouton d'extinction ;
- boutons Appel / Message / Réglages ;
- conversations utilisateur / personnage ;
- réponses ciblées, réactions et événements ;
- journal mémoire ;
- boutons et sous-menus ;
- interactions ;
- Braindance ;
- Refuge ;
- Spotify côté interface ;
- clavier Holophone ;
- verrouillage ;
- avertissement initial ;
- sliders, cases et sélecteurs ;
- jauges CPU/RAM et états techniques V2.

Les médias eux-mêmes ne sont pas filtrés ni recolorés.

## Humeurs

`famColor()` utilise :

- la couleur historique de la famille en thème Original ;
- l'accent global du thème dans les quatre nouveaux thèmes.

## Synchronisation Capacitor

Exécutée avec succès.

Plugins détectés :

- `@capacitor/app@8.1.1`
- `@capacitor/filesystem@8.1.3`
- `@capacitor/keyboard@8.0.5`
- `@capacitor/local-notifications@8.3.1`
- `@mindlib-capacitor/send-intent@8.0.6`

Les assets Android synchronisés contiennent :

- `APPV = 2.9.0` ;
- `holophone-v2.js = 2.9.0` ;
- les règles CSS `Holophone 2.9.0 — moteur de thèmes globaux`.

## Compilation Android

Une compilation `assembleDebug` a été lancée. Le wrapper a tenté de télécharger :

`https://services.gradle.org/distributions/gradle-8.14.3-all.zip`

L'environnement de validation n'a pas d'accès réseau et a renvoyé :

`UnknownHostException: services.gradle.org`

L'échec intervient donc avant la compilation des sources Android. La synchronisation Capacitor, elle, est terminée avec succès.

## Validation smartphone recommandée

Le rendu final des halos dépend du moteur WebView et de l'écran du smartphone. Tester les cinq palettes sur le téléphone reste donc la validation visuelle de référence, en particulier :

- luminosité Wallace Gold ;
- équilibre bleu / halo rouge de Red & Blue ;
- lisibilité Blue-Green ;
- intensité Full Neon Red.

## Correctif post-assemblage — import MP3

Un défaut a été identifié après la première génération du patch 2.9.0 : le gestionnaire `audioLibraryFile.onchange` conservait la `FileList` vivante puis effaçait le champ avant de la parcourir.

Correction appliquée :

```js
const files=Array.from((e.target&&e.target.files)||[]);
if(e.target)e.target.value='';
```

La copie est donc indépendante du contrôle `<input type="file">` avant sa remise à zéro.

Contrôles effectués après correction :

- syntaxe du JavaScript inline : OK ;
- syntaxe de `www/js/holophone-v2.js` : OK ;
- présence de `multiple` sur le sélecteur MP3 : OK ;
- traitement `audioImportFiles(files)` reçoit désormais un tableau stable ;
- synchronisation Capacitor Android : OK.
