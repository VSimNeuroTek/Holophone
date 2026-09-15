# Release Android — Holophone 3.1.2

## Version

```text
versionName 3.1.2
versionCode 44
```

## Procédure

1. Fermer Android Studio.
2. Appliquer `APPLIQUER_PATCH_3.1.2.cmd`.
3. Lancer `RELEASE_3.1.2.cmd`.
4. Attendre la recette, `cap sync android` et la préparation native.
5. Dans Android Studio : **Build > Generate Signed App Bundle or APK > APK > release**.
6. Réutiliser impérativement le keystore existant.

## Vérifications appareil

- lancement avec PIN puis biométrie : aucun flash de l'accueil avant splash ;
- animation VSNT complète sur les quatre styles ;
- couleurs propres à chaque style ;
- logo orange complet visible dans **À propos** ;
- icône launcher blanche VSNT et fond transparent ;
- après mise à jour, si le launcher conserve temporairement l'ancienne icône, retirer/remettre le raccourci ou relancer le launcher.
