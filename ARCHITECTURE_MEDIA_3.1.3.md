# Architecture média — Holophone 3.1.3

## Objectif

Fiabiliser la persistance du catalogue **Vidéos YouTube / Musique Spotify** de chaque personnage.

Jusqu'en 3.1.2, `c.bd` et `c.mus` étaient uniquement sérialisés dans `v7.contacts` via `saveContacts()`. L'interface affichait immédiatement les objets en mémoire, mais ne relisait pas le stockage pour confirmer que l'écriture avait réellement réussi.

## 3.1.3

Une copie canonique secondaire est conservée dans IndexedDB, clé :

```text
meta_media_catalog_v1
```

Structure :

```text
{
  <contactId>: {
    bd:  [{ label, id }],
    mus: [{ label, url, kind }],
    updatedAt
  }
}
```

Chaque mutation média suit désormais :

```text
modifier la RAM
→ saveContacts()
→ écrire meta_media_catalog_v1 dans IndexedDB
→ relire IndexedDB
→ vérifier les nombres d'éléments
→ confirmer dans l'UI
```

Si l'écriture ou la relecture échoue, l'ajout est retiré de la RAM et l'utilisateur voit une erreur.

Au boot, `mediaCatalogHydrate()` restaure la copie dédiée avant l'affichage des écrans. Lors d'une restauration de sauvegarde complète, `mediaCatalogSyncAll()` resynchronise la copie dédiée afin qu'une ancienne version ne puisse pas écraser le contenu restauré.

La sauvegarde Holophone reste fondée sur les contacts : le format v12 ne change pas et contient déjà `bd` et `mus`.
