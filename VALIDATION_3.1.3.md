# Validation — Holophone 3.1.3

## Validation statique

La recette `scripts/test-stable-v313.js` passe **43 / 43 contrôles** avant synchronisation Capacitor et **43 / 43** après `cap sync android` sur une reconstruction complète du projet.

Contrôles spécifiques 3.1.3 :

- présence de `meta_media_catalog_v1` ;
- écriture contacts + IndexedDB ;
- relecture de vérification ;
- rollback UI si l'ajout ne peut pas être persisté ;
- restauration backup → `mediaCatalogSyncAll()` ;
- métadonnées du catalogue exclues des faux orphelins ;
- nouveau logo À propos présent ;
- version Web / V2 / Stability = 3.1.3 ;
- syntaxe JS inline et externe ;
- fichiers Gradle/PowerShell critiques sans BOM.

## Capacitor

`cap sync android` : **OK**.

Plugins détectés :

- @capacitor/app@8.1.1
- @capacitor/filesystem@8.1.3
- @capacitor/keyboard@8.0.5
- @capacitor/local-notifications@8.3.1
- @mindlib-capacitor/send-intent@8.0.6

## Gradle

La compilation native ne peut pas être menée dans l'environnement de préparation : Gradle tente de récupérer `gradle-8.14.3-all.zip` depuis `services.gradle.org` et échoue par `UnknownHostException` avant compilation du code du projet.
