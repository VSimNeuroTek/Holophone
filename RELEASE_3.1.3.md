# Release Android — Holophone 3.1.3

## Version

```text
versionName 3.1.3
versionCode 45
```

## Procédure

1. Fermer Android Studio.
2. Appliquer `APPLIQUER_PATCH_3.1.3.cmd`.
3. Lancer `RELEASE_3.1.3.cmd`.
4. Le script exécute la recette statique, règle la version Android, restaure le patch notification, lance `cap sync android`, prépare Android et rejoue la recette.
5. Dans Android Studio : `Build` → `Generate Signed App Bundle or APK` → `APK` → `release`.
6. Utiliser le keystore existant.

## Recette téléphone recommandée

- ajouter une vidéo YouTube ; sortir de l'écran ; revenir ; vérifier qu'elle est encore là ;
- fermer complètement Holophone, relancer, déverrouiller ; vérifier la vidéo ;
- ajouter un morceau Spotify ; refaire le même test ;
- renommer le morceau ; relancer l'app ; vérifier le nouveau libellé ;
- supprimer vidéo et musique ; relancer ; vérifier qu'ils ne reviennent pas ;
- lancer `Santé Holophone` et vérifier qu'aucun nouvel orphelin n'est dû à `meta_media_catalog_v1`.
