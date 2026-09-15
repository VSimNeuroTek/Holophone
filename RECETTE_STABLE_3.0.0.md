# Recette téléphone — Holophone 3.0.0

## A. Mise à jour

- installer par-dessus la version précédente ;
- vérifier que les conversations sont toujours présentes ;
- vérifier que les images, MP3 et thèmes existants sont toujours disponibles.

## B. Santé

Ouvrir :

```text
Réglages > Sous le capot > Santé Holophone 3.0
```

- lancer `Contrôler` ;
- aucune ligne ne doit être en ERREUR ;
- `À SURVEILLER` est acceptable uniquement si l'explication est attendue, par exemple snapshot pas encore créé ou permission facultative.

Lancer ensuite :

```text
Recette technique
```

Le résultat doit être `OK`.

## C. Démarrage / vie privée

- démarrage sans PIN ;
- démarrage avec PIN ;
- aucun écran métier avant le PIN ;
- biométrie, si activée, doit jouer le splash après déverrouillage ;
- aperçu du sélecteur Android masqué.

## D. Audio

- importer 1 MP3 ;
- importer plusieurs MP3 simultanément ;
- sélectionner un MP3 de splash ;
- vérifier que le splash dure jusqu'à la fin réelle du son ;
- sélectionner un MP3 de notification ;
- envoyer une notification de test ;
- vérifier le texte anonymisé ;
- supprimer un MP3 non utilisé.

## E. Apparence

Tester rapidement :

- Original ;
- Wallace Gold ;
- Red & Blue ;
- Blue-Green ;
- Full Red.

Vérifier accueil, conversation, réglages, clavier et Braindance.

## F. Conversation

Sans chercher à juger le style de Judy, vérifier uniquement la non-régression technique :

- ouvrir une ancienne conversation ;
- envoyer un message ;
- recevoir une réponse ;
- répondre à un message précis ;
- annuler / régénérer si utilisé ;
- rouvrir l'application et vérifier la persistance.

## G. Interactions

- interaction `Toi` ;
- interaction personnage ;
- interaction `Les deux` ;
- recherche ;
- Tout plier / Tout déplier.

## H. Braindance

- lancer une courte Braindance ;
- revenir au chat ;
- envoyer un message normal ;
- vérifier l'absence de refus parasite lié au texte brut de la Braindance ;
- vérifier Replay et audio si utilisés.

## I. Sauvegarde / restauration

- créer une sauvegarde avec médias ;
- conserver le fichier ;
- effectuer une restauration de test ;
- vérifier le rapport Santé ensuite ;
- vérifier que la bibliothèque MP3 est toujours cohérente.

## J. Snapshots

Dans Sous le capot :

- créer un snapshot maintenant ;
- vérifier qu'il apparaît dans la Santé ;
- ne tester la restauration snapshot que si une sauvegarde complète externe existe déjà.
