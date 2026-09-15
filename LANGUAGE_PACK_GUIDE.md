# Holophone — Language Pack Guide (3.3+)

Holophone is French-first. French (`fr-FR`) is the reference language and the final fallback for every missing translation.

A community translation is a UTF-8 JSON file imported from **Settings → Application → Language**. No rebuild is required.

## Minimal format

```json
{
  "meta": {
    "code": "es-ES",
    "name": "Spanish",
    "nativeName": "Español",
    "version": 1,
    "holophoneMinVersion": "3.3.0",
    "author": "Your name or GitHub handle"
  },
  "strings": {
    "language.title": "Idioma",
    "settings.language": "Idioma"
  }
}
```

`meta.code` uses a simple BCP-47 form (`es-ES`, `de-DE`, `it-IT`, `ja`, etc.). Imported files are limited to 1 MiB.

## Stable keys

`strings` contains stable Holophone keys. Missing keys are automatically read from the French pack. This means an older community pack keeps working after Holophone gains new screens; untranslated additions simply appear in French until the pack is updated.

The built-in French and English packs in `www/lang/` are examples and are the best source for the current key set.

## Existing legacy UI

Holophone predates the i18n engine, so some historical screens still contain French source text in the HTML/JavaScript. Language packs can optionally translate those strings with `legacyText` and attributes with `legacyAttrs`:

```json
{
  "legacyText": {
    "Réglages": "Ajustes",
    "Sauvegarde": "Copia de seguridad"
  },
  "legacyAttrs": {
    "Fermer": "Cerrar"
  }
}
```

This compatibility layer is intentionally tolerant. New Holophone code should prefer stable `strings` keys.

## Rules for contributors

- Keep the file UTF-8 without a BOM when possible.
- Do not rename keys.
- Do not add API keys, tokens, personal data or persona data to a language file.
- Preserve placeholders such as `{count}` and `{name}` exactly.
- A language pack changes interface wording only. It does not modify AI prompts, persona memory, safety settings or service configuration.
- Built-in `fr-FR` and `en` packs cannot be overwritten by imports. Community packs use another language code.

## Updating a pack

Importing a pack with the same community language code replaces the previous local copy. Increase `meta.version` so users can see which revision they have installed.
