# Turnaround Life 0.2.0 — QA Report

## Automated checks executed

| Check | Result |
|---|---:|
| JavaScript syntax checks (`npm run check`) | Pass |
| Automated test suite (`npm test`) | 41 passed, 0 failed |
| CSS parsing (tinycss2, all stylesheets) | 0 parse errors |
| HTML static asset references | All referenced local assets exist |
| PWA manifest icon references | Both icon files exist |
| Service-worker Netlify Function bypass | Pass |
| Service-worker cache version and Phase 2 module list | Pass |
| Phase 1 IndexedDB name/version compatibility | Pass |
| Sugar settings row removed | Pass |
| ZIP archive integrity | Verified during packaging |

## Nutrition tests

Automated cases cover per-100g scaling, recipe serving totals, meal aggregation, grams-to-ounces, ingredient-specific cup and tablespoon conversions, fractional quantities, invalid/blank/zero quantities, missing conversion data, missing nutrient values, and invalid nutrient/reference values.

## USDA tests

The Netlify function was tested locally with mocked upstream responses for missing API key, request validation, search success, food-detail success, authentication failure, rate limiting and network failure. USDA response normalization was tested for nutrient IDs, branded per-100g values, branded per-100mL values requiring density, unknown branded reference basis, and portion metadata.

## Not yet tested / deployment-dependent

- Live Netlify deployment and real function invocation on the deployed site.
- A real USDA API request using the user's `USDA_API_KEY`.
- Physical Android device layout and touch behavior.
- Browser/PWA installation and offline restart on Android.
- IndexedDB persistence across actual browser restarts.
- Full browser-based manual add/edit/delete workflow.

No claim is made that these deployment- or device-dependent checks have passed.
