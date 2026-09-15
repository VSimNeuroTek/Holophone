# Changements Holophone 2.9.0

## Objet

Holophone 2.9.0 introduit un **moteur de thèmes d'interface global**.

Le thème historique reste disponible tel quel. Quatre nouvelles palettes peuvent être appliquées à l'ensemble de l'interface sans modifier les photos, avatars, pochettes, vidéos ou images générées.

## Nouveau réglage

Un nouvel écran est disponible dans :

`Réglages > Application > Apparence`

Il propose cinq palettes :

- **Holophone Original** : palette historique multicolore ;
- **Wallace Gold** : noir, ivoire, or et bronze néon ;
- **Red & Blue Neon** : bleu électrique dominant avec halo rouge structurel ;
- **Blue-Green Neon** : cyan, turquoise et bleu-vert ;
- **Full Neon Red** : noir et rouge néon intégral.

## Aperçu instantané

Toucher une palette applique immédiatement un aperçu à toute l'application.

- `Enregistrer` rend le choix persistant ;
- `Annuler l'aperçu` restaure le thème précédemment enregistré ;
- la croix de retour et le bouton Retour Android restaurent également le thème enregistré si l'aperçu n'a pas été confirmé.

## Règle d'uniformisation

Le thème **Holophone Original** conserve volontairement les couleurs fonctionnelles existantes.

Pour les quatre nouveaux thèmes, la couleur ne sert plus à différencier les fonctions :

- Appel, Messages et Réglages partagent la même couleur ;
- les bulles utilisateur / personnage utilisent la même signature lumineuse ;
- interactions, événements, Refuge et Braindance sont uniformisés ;
- les touches normales et fonctionnelles du clavier Holophone reprennent la même palette ;
- boutons, sliders, cases, panneaux, jauges CPU/RAM et états techniques sont recolorés ;
- les anciens accents Spotify vert, Braindance rouge, Refuge bleu, interactions violettes, etc. sont neutralisés dans les nouveaux thèmes.

La distinction fonctionnelle reste portée par :

- les formes ;
- les icônes ;
- les libellés ;
- les positions ;
- les niveaux de luminosité et d'opacité.

## Médias non recolorés

Le moteur de thèmes ne recolore pas :

- avatars ;
- photos ;
- vidéos ;
- pochettes Spotify ;
- images générées ;
- médias du Refuge ou des Braindances.

Le style du splash screen reste également indépendant du thème de l'application.

## Humeurs

Les couleurs dynamiques des familles d'humeur sont conservées en thème Original.

Dans les quatre nouveaux thèmes, les indicateurs d'humeur utilisent l'accent global du thème afin d'éviter le retour de couleurs fonctionnelles étrangères à la palette choisie.

## Persistance et sauvegarde

Le choix est enregistré dans l'objet existant `v7.theme` sous la propriété :

`ui`

Une installation venant de 2.8.9 ne possède pas cette propriété : Holophone utilise alors automatiquement `original`.

Le thème est déjà inclus dans les sauvegardes Holophone grâce à l'objet `THEME` existant.

## Fichiers modifiés

- `www/index.html`
- `www/css/holophone-v2.css`
- `www/js/holophone-v2.js`
- `02_PREPARER_ANDROID_STUDIO.cmd`

## Correctif import MP3 Android

Le sélecteur MP3 de la bibliothèque audio copiait auparavant la `FileList` par référence puis vidait immédiatement le champ fichier. Sur Android WebView, la liste est liée au champ et devenait vide au même instant : l'import quittait donc silencieusement sans ajouter de morceau.

La 2.9.0 corrigée transforme désormais la sélection en tableau indépendant avec `Array.from(...)` **avant** de réinitialiser le champ.

Conséquences :

- import d'un MP3 : fonctionnel ;
- import de plusieurs MP3 en une sélection : fonctionnel ;
- réimport ultérieur du même fichier : toujours possible ;
- le message d'état annonce maintenant le nombre de MP3 en cours d'import.
