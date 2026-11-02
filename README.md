# Turnaround Life — Phase 1 Foundation

A mobile-first, local-first Progressive Web App foundation for nutrition and lifestyle tracking.

## Phase 1 status

Implemented in this package:
- Responsive application shell with six primary tabs in the specified order.
- Initial visual design system with light, dark and system theme options.
- Imperial, metric and both measurement preferences.
- Fluid-ounce, milliliter and both water preferences.
- Additional nutrient preference (potassium, saturated fat, cholesterol and calcium).
- IndexedDB database initialization with stores reserved for the planned features.
- Settings persistence on the device.
- PWA manifest, SVG app icon and service worker app-shell caching.
- Explicit service-worker exclusion for `/.netlify/functions/`.
- Netlify build configuration and a clearly marked USDA function placeholder.
- Basic automated foundation checks.

Not implemented yet: USDA search, ingredient CRUD, nutrition calculations, recipes, meal builder, meal planning, food logging, measurements, charts, data export/import. These are scheduled for subsequent phases.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run check
npm test
npx netlify dev
```

Open the local URL printed by Netlify CLI. For PWA/service-worker testing, use localhost rather than opening `index.html` directly as a file.

## Deploy to Netlify through GitHub

1. Create a new GitHub repository.
2. Extract this ZIP and commit the contents of this folder to the repository root.
3. In Netlify, choose **Add new site → Import an existing project** and connect the repository.
4. Set the publish directory to `.`. The functions directory is already configured as `netlify/functions` in `netlify.toml`.
5. Deploy. No USDA API key is needed for Phase 1.
6. In a later phase, add `USDA_API_KEY` under Netlify **Site configuration → Environment variables** before deploying the USDA integration.

## Data and privacy

Settings are stored locally in the browser's IndexedDB. Clearing site data or uninstalling/resetting the browser may remove local data. Backup/export functionality is planned for a later phase; do not use this foundation as the sole repository for important nutrition records yet.

## Architecture notes

- UI: HTML/CSS and JavaScript ES modules.
- Persistence: IndexedDB, database version 1.
- Server-side integration: Netlify Functions.
- Offline: service worker caches the static app shell only.
- Dynamic function calls are intentionally excluded from service-worker interception and caching.

## QA limitations

Automated foundation checks can run under Node. Browser interaction, Android device behavior, PWA installation, IndexedDB persistence across browser restarts, and live Netlify behavior still require testing in their target environments. USDA integration is not part of Phase 1.
