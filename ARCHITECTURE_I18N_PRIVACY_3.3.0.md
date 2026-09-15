# Holophone 3.3.0 — Architecture i18n & confidentialité

## Objectif

Holophone reste **French-first** : `fr-FR` est la langue de référence, la langue par défaut et le fallback ultime. L'anglais est livré en standard. Des packs communautaires JSON peuvent être importés sans modifier ni recompiler l'application.

## Moteur i18n

Fichier runtime : `www/js/holophone-i18n.js`.

Packs intégrés :
- `www/lang/fr-FR.json`
- `www/lang/en.json`

État local :
- `v7.language` : code actif ;
- `v7.languagePacks` : packs communautaires importés.

Un pack contient :
- `meta` : code, noms, version, auteur ;
- `strings` : clés stables ;
- `legacyText` facultatif : traduction des textes historiques français ;
- `legacyAttrs` facultatif : placeholders, title et aria-label historiques.

Si une clé manque : pack actif → Français → clé technique en dernier recours. Une traduction communautaire ancienne ne bloque donc jamais une version plus récente de Holophone.

Les packs importés sont limités à 1 MiB, validés avant installation, stockés localement et inclus dans les sauvegardes Holophone.

## À propos

Les drapeaux FR / EN ne maintiennent plus un réglage séparé. Ils sont des raccourcis vers la langue globale de l'application.

## Confidentialité

État local `v7.privacy` :

```json
{
  "anonymousNotifications": true,
  "recentsPreview": "auto"
}
```

### Notifications

- `true` : titre `Holophone`, corps générique ;
- `false` : titre = prénom configuré de la persona, corps = aperçu du message, tronqué.

Les notifications déjà planifiées sont annulées lorsqu'on change ce réglage pour éviter qu'un ancien contenu ne subsiste.

### Aperçu Android dans les applications récentes

Modes :
- `auto` : masqué si le PIN Holophone est actif, visible sinon ;
- `hide` : toujours masquer ;
- `show` : toujours afficher.

Le plugin natif `PrivacyControlPlugin` applique dynamiquement :
- Android 13+ : `setRecentsScreenshotEnabled(...)` ;
- Android 12 et antérieurs : ajout/retrait de `FLAG_SECURE`.

Au lancement, `MainActivity` masque d'abord l'aperçu par sécurité ; le réglage utilisateur est appliqué dès que le runtime web est prêt. Le mode immersif edge-to-edge reste indépendant.

## Sauvegardes

La sauvegarde v12 inclut désormais :
- `privacy` ;
- `language.active` ;
- les packs communautaires.

Le checkpoint transactionnel de restauration couvre lui aussi ces deux domaines.
