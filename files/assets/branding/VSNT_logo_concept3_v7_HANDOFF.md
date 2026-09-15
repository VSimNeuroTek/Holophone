# VSNT — Handoff Holophone

## Élément validé

Logo animé **VSim NeuroTek (VSNT) — Concept 03 v7**.

Fichier de référence :
- `VSNT_logo_concept3_v7.html`

## Identité

- Société fictive : **VSim NeuroTek**
- Acronyme : **VSNT**
- Produit : **Holophone™**
- Slogan : **Connecting Minds & Bytes**

## Concept visuel validé

Le symbole représente :
- une sphère centrale ;
- une tige verticale centrale ;
- deux formes latérales évoquant des **mains** entourant la sphère ;
- un grand arc circulaire extérieur ouvert en bas.

Les deux mains doivent :
- être symétriques ;
- suivre des arcs de cercle **concentriques à la sphère centrale** ;
- rester à distance constante de la sphère sur leur partie courbe ;
- se prolonger ensuite verticalement vers le bas pour former les poignets ;
- avoir la même épaisseur que les autres traits du symbole.

## Animation validée

Séquence :
1. La sphère + tige centrale apparaissent depuis le bas.
2. Les deux mains apparaissent lentement en **fade-in**.
3. Elles se referment par rotation autour de leurs poignets fixes.
4. Le grand arc extérieur se dessine progressivement.
5. À la fin, un halo lumineux parcourt une fois cet arc.

Important :
- Les mains ne doivent pas glisser rectilignement vers l'intérieur.
- Elles doivent pivoter autour de leur base/poignet.
- Le fade-in doit être visible et relativement lent.
- L'arc extérieur doit être mathématiquement circulaire.

## Bloc marque à conserver

Sous le symbole :

**VSim**  
**NEUROTEK**  
— ligne horizontale —  
**Connecting Minds & Bytes**

Le rendu typographique et l'espacement du fichier HTML de référence sont validés.

## Intégration Holophone

Le prototype est autonome :
- HTML
- SVG
- CSS
- JavaScript
- aucune dépendance externe

Il peut être repris dans la WebView/Capacitor de Holophone.

### Usage recommandé

Ce logo VSNT peut servir de :
- splash corporate VSNT ;
- écran À propos ;
- signature de démarrage avant le branding Holophone.

Pour le splash :
- conserver le fond noir ;
- ne pas afficher d'autre UI derrière ;
- lancer l'animation immédiatement une fois l'écran VSNT affiché ;
- éviter tout flash de l'écran d'accueil Holophone avant la fin du splash.

## À ne pas réinventer

Le fichier HTML joint est la référence visuelle et géométrique.
Pour l'intégration, reprendre autant que possible :
- les paths SVG ;
- les timings ;
- les animations CSS ;
- la typographie et les espacements.

Ne pas redessiner les mains "à l'œil" : elles utilisent des arcs concentriques à la sphère centrale.
