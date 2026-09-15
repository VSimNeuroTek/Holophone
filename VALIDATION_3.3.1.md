# Validation Holophone 3.3.1

## Recette statique

Commande :

```text
node scripts/test-stable-v331.js
```

Attendu : **61/61 contrôles OK**.

## Recette téléphone ciblée

1. Ouvrir une conversation → Musique → chercher un morceau → toucher une carte → vérifier que la sélection reste affichée → **Envoyer à [Persona]** → vérifier que la carte part dans la conversation.
2. Provoquer/traiter une proposition de pièce Refuge → aucune erreur `c is not defined`.
3. Poser une question juste au moment où un événement Refuge pourrait être éligible → la Persona répond à la question, pas à un événement injecté.
4. Converser plusieurs tours → vérifier l'absence de narration systématique de gestes/postures ; les actions structurées restent des actions `act`.
5. Vérifier que la Continuité vivante existe toujours dans **Persona → Vie de …**.
6. Revalider rapidement langue FR/EN et paramètres de confidentialité 3.3.0.
