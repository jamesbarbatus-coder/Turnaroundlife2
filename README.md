# Turnaround Life — Phase 2

A mobile-first, local-first Progressive Web App for nutrition and lifestyle tracking.

## Release status

**Version:** 0.2.0  
**Scope:** Phase 1 foundation plus Phase 2 nutrition engine and ingredient library.

### Implemented

- Responsive six-tab application shell.
- Light, dark and system appearance settings.
- Imperial, metric and both measurement preferences; fluid-ounce and milliliter preferences.
- Removal of the unused sugar-tracking row from Settings.
- IndexedDB persistence using the existing `turnaround-life` database and version 1 schema. Phase 2 does not force a database upgrade or replace existing settings.
- Ingredient library with manual add, edit, delete, filtering and local persistence.
- USDA FoodData Central search and food-detail retrieval through `netlify/functions/usda.js`.
- USDA error classification for missing key, invalid request, authentication, rate limiting, upstream failure, timeout, network failure and malformed responses.
- Centralized nutrient model and calculation engine.
- Nutrient fields: calories, protein, carbohydrates, total fat, fiber, sodium, potassium, saturated fat, cholesterol and calcium. Sugar is not included.
- Internal nutrient basis of per 100 grams.
- Gram, ounce, cup and tablespoon conversions. Volume conversions require ingredient-specific verified weights; tablespoons can derive from grams per cup using 16 US tablespoons per cup.
- USDA food portion weights can populate ingredient-specific cup or tablespoon conversions when the USDA portion description and gram weight support that conversion.
- Fractional quantities and full-precision internal calculations.
- Recipe and meal calculation primitives ready for later UI phases.
- Missing nutrient values remain unknown and are flagged rather than represented as a misleading zero.
- Service-worker app-shell cache version bumped to v2; Netlify Function requests are explicitly bypassed and never cached.
- Automated tests for calculation, conversion, USDA normalization, serverless function behavior and foundation invariants.

### USDA nutrient basis handling

USDA FoodData Central includes multiple data types with different metadata and serving/portion contexts. Foundation data reports nutrient values on a 100-gram basis. The USDA Global Branded Food Products Database standardizes nutrient values to a 100-gram or 100-milliliter basis. Branded label serving size is not treated as the nutrient reference basis.

- Branded records with gram units are treated as per 100 grams.
- Branded records with milliliter units require a verified grams-per-100-milliliter density before conversion to the application's per-100-gram basis.
- Branded records without a recognizable basis require the user to confirm the basis before saving.
- USDA portions may supply ingredient-specific volume conversion weights, but an arbitrary household portion is never substituted for the nutrient reference basis.

This avoids assuming that a cup, milliliter, or package serving weighs a particular amount.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm run check
npm test
```

For local Netlify Functions, install Netlify CLI, copy `.env.example` to `.env`, enter your key in `.env`, and run:

```powershell
Copy-Item .env.example .env
# Edit .env and replace the placeholder value
npx netlify dev
```

The `.env` file is ignored by Git. Never commit a real API key.

Open the local URL printed by Netlify CLI. Use localhost/Netlify Dev rather than opening `index.html` directly as a file so IndexedDB and the service worker can operate normally.

## Deploy through GitHub and Netlify

1. Extract this ZIP.
2. Commit the contents of the `turnaround-life-phase1` directory to the root of your GitHub repository (you may rename the local folder to `turnaround-life`).
3. In Netlify, import the GitHub repository.
4. The included `netlify.toml` sets the publish directory to `.` and functions directory to `netlify/functions`.
5. In Netlify site configuration, add an environment variable named `USDA_API_KEY` containing your USDA FoodData Central API key. You can request a key at https://fdc.nal.usda.gov/api-key-signup.
6. Trigger a new deployment after adding the environment variable.
7. Test the deployed function directly with a search request such as `/.netlify/functions/usda?action=search&q=oats`.
8. Confirm that the response is JSON, not the cached application HTML. Also test a detail request after choosing an FDC ID from the search response.

The API key is used only by the Netlify serverless function. It is not embedded in frontend JavaScript or returned to the browser. USDA's official API guide documents the search and food-detail endpoints, API-key requirement and rate limits: https://fdc.nal.usda.gov/api-guide/.

## Data and privacy

Ingredient records and settings are stored locally in the browser's IndexedDB. Clearing browser/site data can remove local records. Export/import backup functionality is scheduled for a later phase; make independent backups of important records until that feature is implemented.

## QA report

Run `npm run check` and `npm test` before packaging. The automated tests cover:

- Per-100g scaling and recipe/meal totals.
- Grams, ounces, cups, tablespoons and fractional quantities.
- Missing conversions, missing nutrient values, zero and invalid quantities.
- USDA nutrient ID mapping and branded 100g/100ml basis handling.
- Netlify function request validation, missing API key, simulated upstream success, authentication errors, rate limits and network errors.
- Service-worker function bypass, required app-shell modules, navigation routes, sugar-row removal and database compatibility.

**Not yet verified in this package:** live Netlify deployment, a real USDA API request using your own key, actual Android-device rendering, PWA installation/restart behavior, and IndexedDB persistence across real browser restarts. The USDA function has been tested locally with mocked upstream responses; this does not substitute for live deployment verification.

## Next phases

- Phase 3: recipe management UI using the shared calculation engine.
- Phase 4: saved meal builder.
- Phase 5: weekly planner and daily food logging.
- Phase 6: dashboard, targets, water tracking and measurements.
- Phase 7: backup/restore completion, full regression testing and deployment verification.
