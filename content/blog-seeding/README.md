# Blog content seeding

This folder contains the batch-upload contract for adding NovaTools blog articles without hand-editing every locale manifest.

## Workflow

1. Copy `batch.example.json` to a dated file outside this template, for example `content/blog-seeding/2026-05-article-batch.json`.
2. Replace the sample with human-authored article metadata:
   - `slug`
   - `title`
   - `excerpt`
   - `summary`
   - `category`
   - `coverImage` or `visualBrief`
   - `faq`
   - `cta`
   - `relatedToolLinks`
   - `relatedArticleLinks`
   - optional `localizations` for human-reviewed locale copy
3. Validate only:

   ```bash
   npm run lint:blog-seed -- --batch=content/blog-seeding/2026-05-article-batch.json
   ```

4. Write manifests and generated assets:

   ```bash
   npm run seed:blog -- --batch=content/blog-seeding/2026-05-article-batch.json
   ```

The seed command writes route-ready entries to all supported blog locale manifests. If a locale has no human-provided localization, the entry is marked with `localizationStatus.status = "needs-human-localization"` and `machineTranslated = false`; it does not invent translated copy.

## Localization memory and terminology

- `translation-memory.json` stores human-approved sentence or phrase mappings.
- `terminology-base.json` stores approved terms that translators should reuse.

These files are infrastructure for professional localization. They are not a machine translation source and should only contain reviewed entries.
