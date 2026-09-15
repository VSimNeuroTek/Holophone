# Architecture 3.1.4 — Persona neutre & Android immersif

## 1. Principe d'identité

L'identité métier vient toujours du contact/persona actif. Les helpers de référence sont :

```js
characterName(c)
characterFullName(c)
```

Aucun composant de production ne doit déduire le prénom du personnage d'une constante, d'un ID ou d'un rôle de message.

Le rôle de modèle interne est `character`. Il désigne le personnage actif, quel que soit son prénom.

## 2. Compatibilité ascendante

La migration 3140 normalise les conversations et structures persistées déjà existantes. Les valeurs inconnues qui correspondaient historiquement au rôle du personnage deviennent `character` ; `v`, `sys`, `evt` et `refuge` restent inchangés.

Les anciennes clés de stockage et noms de DB nécessaires à la reprise sont reconstruits par code à partir d'un token historique, puis migrés vers :

```text
v7.api.keys
v7.api.model
v7.api.provider
v7.voice
holophone-media
```

Le stockage courant n'utilise plus le prénom du personnage.

## 3. Full immersive Android

`WindowCompat.setDecorFitsSystemWindows(window, false)` active le edge-to-edge. Un `WindowInsetsControllerCompat` masque `WindowInsetsCompat.Type.systemBars()` et autorise leur apparition temporaire uniquement par geste système.

La réapplication sur `onResume`, `onPostResume` et `onWindowFocusChanged` évite que les barres restent visibles après une boîte de dialogue Android, le sélecteur de fichiers ou un aller-retour vers une autre application.

`FLAG_SECURE` / `setRecentsScreenshotEnabled(false)` restent inchangés et indépendants du plein écran.

## 4. Safe areas Web

Le conteneur racine occupe la surface complète. Le padding du contenu tient compte de :

```css
env(safe-area-inset-top)
env(safe-area-inset-right)
env(safe-area-inset-bottom)
env(safe-area-inset-left)
```

Ainsi, la bordure visuelle peut épouser l'écran sans placer les boutons sous la caméra ou les zones gestuelles.

## 5. Garde-fou release

La release 3.1.4 exige la présence du patch canonique `scripts/patches/android/MainActivity.java`. La recette vérifie également l'absence du prénom historique dans tout le code de production.
