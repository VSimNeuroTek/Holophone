# Changements Holophone 2.8.8

## Démarrage paramétrable

L'écran **Réglages → Application → Démarrage** permet désormais de choisir entre quatre identités visuelles :

- **Classique 2.8.7** : le splash ambre déjà présent ;
- **Wallace / Joi** : rendu corporate doux, ivoire et or tamisé ;
- **Minimaliste** : fond noir, lignes fines et signal discret ;
- **Cyberpunk** : rouge Holophone, cyan et géométrie plus agressive.

Le choix est sauvegardé et conservé après fermeture complète de l'application.

## Jingle personnalisable

Le même écran permet :

- d'importer un fichier MP3 ;
- de tester immédiatement le splash sélectionné ;
- de restaurer le jingle d'origine `joi_startup.mp3`.

Le MP3 importé est copié dans le stockage privé IndexedDB d'Holophone. L'application ne conserve pas un simple lien vers le fichier choisi.

### Règles de validation

- format attendu : MP3 ;
- fichier non vide ;
- taille maximale : 40 Mo ;
- durée lisible dans les métadonnées audio.

## Durée synchronisée sur le son

Le splash ne repose plus sur une durée arbitraire :

- la lecture audio démarre ;
- Holophone attend l'événement réel de fin du morceau ;
- le splash disparaît seulement lorsque le jingle est terminé.

Un morceau long produira donc volontairement un écran de démarrage long.

Si Android refuse exceptionnellement la lecture audio, Holophone utilise un délai de secours afin de ne pas bloquer définitivement le lancement.

## Bandeau de performances

Le bandeau supérieur affiche maintenant à gauche :

```text
Holophone v2.8.8
```

Les jauges CPU et RAM restent à droite.

Le numéro provient de la constante de version de l'application afin de rester cohérent avec le diagnostic et l'écran À propos.

## Compatibilité verrouillage

Le code PIN reste prioritaire :

- aucun splash n'est affiché avant la saisie du code ;
- après déverrouillage, le splash choisi et son jingle sont joués ;
- aucun écran métier n'est exposé avant le déverrouillage.

## Sauvegarde

La sauvegarde complète enregistre :

- le style de splash choisi ;
- le nom et les métadonnées du jingle ;
- le MP3 personnalisé lorsque l'option d'inclusion des médias est activée.

## Fichiers modifiés

- `www/index.html`
- `www/js/holophone-v2.js`
- `02_PREPARER_ANDROID_STUDIO.cmd`
