# Changelog

## 0.2.0 — Phase 2

- Removed the unused Sugar Tracking row from Settings.
- Added the centralized nutrition calculation and unit conversion modules.
- Added the local ingredient library with create, edit, delete and filtering.
- Added USDA FoodData Central search and detail proxy through a Netlify Function.
- Added explicit handling for USDA branded records expressed per 100 g versus per 100 mL.
- Preserved the Phase 1 IndexedDB database name and version.
- Bumped the service-worker cache version and added the Phase 2 modules to the app shell.
- Added automated tests for nutrition, conversions, USDA normalization, serverless behavior and foundation invariants.
- Corrected a trailing punctuation typo in the existing layout stylesheet that caused a CSS parser error.
