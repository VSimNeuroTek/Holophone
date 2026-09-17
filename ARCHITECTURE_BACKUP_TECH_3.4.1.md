# Architecture sauvegarde 3.4.1

La sauvegarde v13 possède deux couches complémentaires.

1. **Structure métier** : personnages, conversations, mémoire, Refuge, Spotify, Braindance, actions, voix, thème, langue, confidentialité, démarrage et audio.
2. **Snapshot brut** : préférences locales/Store et l intégralité de `holophone-media/files` (IndexedDB), médias binaires convertis en data URL.

Le fichier global est écrit dans `Documents/Holophone/saves`. L import restaure les structures métier, réhydrate les médias, restaure le snapshot brut puis recharge Holophone afin que tous les états runtime repartent depuis les données restaurées.

Les secrets/API restent exclus par défaut et ne sont inclus que si l utilisateur active explicitement l option correspondante.

Les sauvegardes v12 restent importables ; seules les v13 disposent du snapshot exhaustif.
