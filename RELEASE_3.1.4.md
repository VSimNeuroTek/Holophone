# Release Holophone 3.1.4

## Version Android

```text
versionName 3.1.4
versionCode 46
```

Schéma de données : `3140`.

## Procédure

1. Fermer Android Studio.
2. Appliquer `APPLIQUER_PATCH_3.1.4.cmd`.
3. Lancer `RELEASE_3.1.4.cmd`.
4. Le workflow contrôle la recette, positionne la version Android, restaure les patches natifs, exécute `cap sync android`, prépare Android et relance la recette.
5. Dans Android Studio : **Build > Generate Signed App Bundle or APK > APK > release**.
6. Utiliser le keystore existant ; ne pas en créer un nouveau.

`RELEASE_3.1.4.cmd` est la voie recommandée. Ne pas modifier `build.gradle` manuellement.

## Recette appareil conseillée

- relancer l'application avec PIN/biométrie et vérifier le splash ;
- vérifier que la barre de statut et la barre de navigation sont masquées ;
- balayer depuis le bord : Android peut montrer temporairement ses barres ; elles doivent de nouveau disparaître après reprise/focus ;
- vérifier que la bordure Holophone utilise bien le haut de l'écran sans masquer les commandes sous le poinçon ;
- renommer temporairement la persona dans ses réglages et vérifier les écrans Conversation, Vie de ..., Refuge, Braindance, Spotify et appels ;
- vérifier que Réglages affiche **Persona**.
