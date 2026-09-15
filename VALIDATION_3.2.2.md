# Validation Holophone 3.2.2

## Recette statique

Commande :

```text
node scripts/test-stable-v322.js
```

Résultat de référence : **62/62 contrôles OK**.

Les nouveaux contrôles 3.2.2 vérifient notamment :

- logo VSNT compact 76 × 76 dans le bandeau fixe ;
- absence de l'ancien grand logo scrollable ;
- boutons 🇫🇷 / 🇬🇧 et préférence locale `v7.aboutLang` ;
- présence des textes français et anglais dans le runtime ;
- identité SHA-256 entre le logo runtime et sa source canonique ;
- présence du PNG dans le projet synchronisé Android.

## Capacitor

`cap sync android` : OK dans l'environnement de validation, 5 plugins détectés.

Recette après synchronisation : **62/62 contrôles OK**.

## Gradle

Comme pour les lots précédents, l'environnement de validation ne garantit pas l'accès à `services.gradle.org`. Si Gradle doit télécharger sa distribution et que le réseau est bloqué, l'échec intervient avant compilation du code. La compilation Android finale reste donc à effectuer sur le poste utilisateur via Android Studio.
