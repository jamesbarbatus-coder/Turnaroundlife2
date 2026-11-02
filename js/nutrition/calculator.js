import { NUTRIENT_KEYS } from './nutrients.js';
import { quantityToGrams } from './conversions.js';

export function calculateIngredient(ingredient, quantity, unit = 'g') {
  const grams = quantityToGrams(quantity, unit, ingredient.measurementConversions || {});
  const scale = grams / 100;
  const source = ingredient.nutrientsPer100g || {};
  const nutrients = Object.fromEntries(NUTRIENT_KEYS.map(key => {
    const value = source[key];
    if (value === null || value === undefined || value === '') return [key, null];
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) throw new RangeError(`Ingredient nutrient ${key} must be a finite, non-negative number.`);
    return [key, numeric * scale];
  }));
  return { grams, nutrients, missingNutrients: NUTRIENT_KEYS.filter(key => nutrients[key] === null) };
}

export function sumNutrition(contributions) {
  const totals = {};
  const missingNutrients = [];
  for (const key of NUTRIENT_KEYS) {
    let sum = 0;
    let known = 0;
    let missing = false;
    for (const item of contributions) {
      const value = item?.nutrients?.[key];
      if (value === null || value === undefined || !Number.isFinite(Number(value))) missing = true;
      else { sum += Number(value); known += 1; }
    }
    totals[key] = known ? sum : null;
    if (missing) missingNutrients.push(key);
  }
  return { totals, missingNutrients };
}

export function calculateRecipe(components, servings = 1) {
  const count = Number(servings);
  if (!Number.isFinite(count) || count <= 0) throw new RangeError('Recipe servings must be greater than zero.');
  const contributions = components.map(component => calculateIngredient(component.ingredient, component.quantity, component.unit));
  const total = sumNutrition(contributions);
  const perServing = Object.fromEntries(NUTRIENT_KEYS.map(key => [key, total.totals[key] === null ? null : total.totals[key] / count]));
  return { total: total.totals, perServing, missingNutrients: total.missingNutrients, componentWeightsGrams: contributions.map(item => item.grams) };
}

export function calculateMeal(components) {
  const contributions = components.map(component => {
    if (component.type === 'ingredient') return calculateIngredient(component.ingredient, component.quantity, component.unit);
    if (component.type === 'recipe') {
      if (component.quantity === '' || component.quantity === null || component.quantity === undefined) throw new RangeError('Recipe quantity must be a finite, non-negative number.');
      const servings = Number(component.quantity);
      if (!Number.isFinite(servings) || servings < 0) throw new RangeError('Recipe quantity must be a finite, non-negative number.');
      const nutrients = Object.fromEntries(NUTRIENT_KEYS.map(key => [key, component.recipe.perServing?.[key] == null ? null : component.recipe.perServing[key] * servings]));
      return { nutrients };
    }
    throw new TypeError(`Unsupported meal component type: ${component.type}`);
  });
  return sumNutrition(contributions);
}

export function formatNutrient(value, decimals = 1) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: decimals }).format(Number(value));
}
