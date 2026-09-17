# Holophone 3.4.1 — release technique

- Répare la sauvegarde globale : suppression de la dépendance morte `toyList` et normalisation vers `c.toys`.
- Nouveau format de sauvegarde v13 avec snapshot structuré + préférences locales + stockage IndexedDB complet.
- Export Android dans `Documents/Holophone/saves`.
- Les sauvegardes fichier incluent toujours les médias. Les clés API restent optionnelles.
- Restauration v13 exhaustive puis redémarrage de l application.
- Compatibilité des sauvegardes v12 conservée.
- Répare la superposition du bouton Vérifier sur l analyse du stockage.
- Audit statique du hub Réglages : toutes les entrées principales doivent être câblées.
