# Changements Holophone 2.8.6

## Interactions — droit d'utilisation

Chaque interaction possède désormais le champ interne `actors` :

- `character` : personnage uniquement ;
- `user` : utilisateur uniquement ;
- `both` : les deux.

L'interface affiche ces valeurs sous la forme :

- prénom réel du contact courant ;
- `Toi` ;
- `Les deux`.

### Compatibilité

Une interaction provenant d'une version antérieure et ne possédant pas `actors` est normalisée en `both`.

Aucune interaction existante n'est supprimée ni désactivée lors de la mise à jour.

## Interactions — filtrage réel côté moteur

Le filtrage est appliqué à plusieurs niveaux :

1. le sélecteur de l'utilisateur n'affiche que `user` et `both` ;
2. le bloc d'actions envoyé au modèle n'expose que `character` et `both` ;
3. les alternatives de réponse physique du personnage sont elles aussi filtrées ;
4. un identifiant interdit renvoyé malgré tout par le modèle est rejeté avant affichage ;
5. `sendUserAction` et `sendJudyAction` possèdent un garde-fou final sur le droit d'utilisation.

Cette redondance évite qu'un simple contournement d'interface suffise à utiliser une interaction réservée à l'autre acteur.

## Interactions — recherche

Une recherche instantanée est disponible :

- dans le sélecteur rapide d'interactions ;
- dans l'écran de configuration.

La recherche porte sur :

- nom de catégorie ;
- nom de l'interaction ;
- formulation ;
- humeur ;
- niveau ;
- portée (`Toi`, prénom du personnage, `Les deux`).

La recherche ignore les accents et la casse.

## Interactions — tout plier / tout déplier

Le sélecteur rapide possède une barre flottante/sticky contenant :

- la recherche ;
- `Tout plier` ;
- `Tout déplier`.

L'écran de configuration possède la même logique pour parcourir de longues bibliothèques d'interactions.

## Libellés dynamiques

Les textes de l'écran Interactions et du compositeur utilisent le prénom du contact courant.
Le réglage n'emploie donc pas `Judy` en dur pour désigner le personnage.
