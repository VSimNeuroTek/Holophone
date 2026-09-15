# Release Holophone 3.1.0

## Installation

1. Fermer Android Studio.
2. Décompresser le patch.
3. Lancer `APPLIQUER_PATCH_3.1.0.cmd`.
4. Lancer `RELEASE_3.1.0.cmd`.

Le workflow sécurisé règle automatiquement :

```gradle
versionCode 42
versionName "3.1.0"
```

Puis il exécute les contrôles statiques, synchronise Capacitor, applique les correctifs Android persistants et ouvre Android Studio.

## Génération APK

Dans Android Studio :

1. `Build > Generate Signed App Bundle or APK...`
2. `APK`
3. utiliser le keystore existant `signing\lumen-release.jks`
4. variante `release`
5. installer par-dessus la 3.0.0 afin de conserver toutes les données.

## Recette téléphone prioritaire

Après installation :

1. ouvrir Holophone et vérifier que le PIN/splash fonctionnent comme avant ;
2. aller dans `Réglages > Personnage > Vie de Judy` ;
3. vérifier l'affichage de l'activité et des quatre états qualitatifs ;
4. échanger quelques messages, faire éventuellement une interaction/refuge, puis revenir sur cet écran ;
5. vérifier que la chronologie évolue ;
6. laisser une initiative de Judy se produire si possible et vérifier qu'elle reste naturelle ;
7. lancer `Santé Holophone > Contrôler` puis `Recette technique` ;
8. vérifier qu'aucune régression n'apparaît sur conversations, MP3, thème, notifications ou Braindance.

## Principe de non-régression

3.1.0 ne doit pas réinitialiser :

- conversations ;
- mémoire ;
- goûts ;
- galerie ;
- avatars ;
- refuge ;
- interactions ;
- thèmes ;
- bibliothèque MP3 ;
- Interaction IDs Gemini.
