TURNAROUND LIFE · VERSION 4.0

This is the complete Netlify/GitHub deployment package for Turnaround Life.

VERSION 4 CHANGES
- Numeric fields in modal forms accept decimal values (step=any), including fractional servings and quantities.
- Ingredient quantities in recipe creation and meal building support grams (g), ounces (oz), cups, and tablespoons (Tbsp).
- Ounces convert to grams using 28.349523125 g per oz.
- Cups and tablespoons use an ingredient-specific grams-per-cup value. Enter this when saving a manual ingredient or when saving a USDA result. One US cup is treated as 16 tablespoons. The app deliberately refuses volume calculations when the ingredient has no grams-per-cup value rather than guessing a generic density.
- Recipe ingredient amounts are normalized to grams before nutrition is calculated.
- Ingredient nutrition is stored per 100 g. Recipe nutrition is stored per serving. Meal calculations multiply ingredient values by grams/100 and recipe values by the selected number of servings.
- Calculations retain precision internally and round only for display; auto-calculated recipe values retain four decimal places.
- USDA branded search results with a gram serving-size declaration are normalized to a per-100-g basis. Branded entries without a gram serving weight should be checked manually before relying on their totals.
- Service worker cache is versioned as turnaround-life-v4 and continues to bypass Netlify Functions.

IMPORTANT DEPLOYMENT NOTES
- Deploy this ZIP by updating the files in the existing GitHub repository on the main branch. Do not use Netlify Drop; the USDA serverless function requires the GitHub-connected Netlify deployment.
- Preserve the Netlify environment variable USDA_API_KEY (singular KEY). Never put the API key in app.js or share it publicly.
- Netlify build settings: Base directory blank, Build command blank, Publish directory ., Functions directory netlify/functions.
- Personal app data is stored locally in this browser/device. Export/backup and cloud sync are not included.

TESTING SUGGESTIONS
1. Create a manual ingredient with nutrition per 100 g and a known grams-per-cup value.
2. Build a recipe with a decimal quantity, then compare per-serving values against a hand calculation.
3. Build a meal with a mix of grams, ounces, cups, tablespoons, and fractional recipe servings.
4. Confirm that cup/tablespoon conversion is blocked for ingredients without a grams-per-cup value.
5. Search USDA and compare branded foods carefully, especially when servingSizeUnit is not grams.
