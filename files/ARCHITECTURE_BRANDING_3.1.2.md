# Architecture branding — Holophone 3.1.2

## Source visuelle de référence

Les fichiers de référence sont conservés dans :

```text
assets/branding/VSNT_logo_concept3_v7.html
assets/branding/VSNT_logo_concept3_v7_HANDOFF.md
assets/branding/vsnt-mark-white-source.png
assets/branding/vsnt-logo-full-source.png
```

Le SVG du splash est intégré dans `www/index.html` pour garantir un rendu immédiat dans la WebView, sans requête supplémentaire ni iframe.

## Splash

Le même SVG animé est utilisé dans les quatre styles. Les formes et timings restent communs ; seules les variables de palette changent :

```text
--vsnt-accent
--vsnt-soft
--vsnt-halo
--vsnt-core
```

Le moteur force un redémarrage de l'animation à chaque affichage avec `startupRestartVsntAnimation()`.

Durée de référence de l'animation : environ `5980 ms`. `startupRunVisible()` attend à la fois l'animation et le jingle : le plus long des deux détermine la fin du splash.

## À propos

Le visuel complet fourni est copié vers :

```text
www/media/vsnt-logo-full.png
```

Il reste volontairement orange sur fond noir, quelle que soit la palette UI choisie.

## Icône Android

Le symbole blanc fourni possède déjà un canal alpha. La 3.1.2 génère :

- `ic_launcher.png` ;
- `ic_launcher_round.png` ;
- `ic_launcher_foreground.png` ;
- adaptive icons v26 ;
- adaptive/monochrome icons v33.

Le fond adaptive est `#00000000`.

Le package Android reste `com.mudva.lumen`.
