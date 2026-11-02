import test from 'node:test';
import assert from 'node:assert/strict';
import { quantityToGrams, GRAMS_PER_OUNCE, normalizeToPer100g } from '../js/nutrition/conversions.js';
import { calculateIngredient, calculateRecipe, calculateMeal, sumNutrition } from '../js/nutrition/calculator.js';
import { emptyNutrients } from '../js/nutrition/nutrients.js';
import { normalizeFdcFood, extractFdcNutrients } from '../js/nutrition/usda-normalizer.js';

const chicken = { name: 'Test chicken', nutrientsPer100g: { calories: 200, protein: 10, carbohydrates: 0, fat: 5, fiber: 0, sodium: 50, potassium: 100, saturatedFat: 1, cholesterol: 30, calcium: 5 }, measurementConversions: { gramsPerCup: 140 } };

test('per-100g scaling: 150 g of 200 kcal and 10 g protein yields 300 kcal and 15 g protein', () => {
  const result = calculateIngredient(chicken, 150, 'g');
  assert.equal(result.nutrients.calories, 300);
  assert.equal(result.nutrients.protein, 15);
});
test('gram-to-ounce conversion uses exact avoirdupois conversion', () => assert.equal(quantityToGrams(1, 'oz'), GRAMS_PER_OUNCE));
test('ingredient-specific cup conversion uses its own grams-per-cup value', () => assert.equal(quantityToGrams(0.5, 'cup', { gramsPerCup: 120 }), 60));
test('tablespoon conversion derives from ingredient cup weight', () => assert.equal(quantityToGrams(1, 'tbsp', { gramsPerCup: 120 }), 7.5));
test('explicit tablespoon conversion takes precedence over derived cup conversion', () => assert.equal(quantityToGrams(2, 'tbsp', { gramsPerCup: 120, gramsPerTablespoon: 8 }), 16));
test('fractional quantities are preserved', () => assert.equal(quantityToGrams(1.25, 'oz'), 1.25 * GRAMS_PER_OUNCE));
test('missing cup conversion is rejected rather than guessed', () => assert.throws(() => quantityToGrams(1, 'cup', {}), /verified grams-per-cup/));
test('missing tablespoon conversion is rejected rather than guessed', () => assert.throws(() => quantityToGrams(1, 'tbsp', {}), /verified tablespoon/));
test('negative and non-finite quantities are rejected', () => { assert.throws(() => quantityToGrams(-1, 'g'), /non-negative/); assert.throws(() => quantityToGrams(NaN, 'g'), /non-negative/); });
test('zero quantity produces zero for known nutrients', () => assert.equal(calculateIngredient(chicken, 0).nutrients.calories, 0));
test('normalization converts serving nutrients to per-100g values', () => { const values = normalizeToPer100g({ calories: 60, protein: 3 }, 30); assert.equal(values.calories, 200); assert.equal(values.protein, 10); });
test('invalid reference weights are rejected', () => assert.throws(() => normalizeToPer100g({ calories: 20 }, 0), /greater than zero/));
test('invalid nutrient values are rejected during normalization', () => assert.throws(() => normalizeToPer100g({ calories: -1 }, 100), /non-negative/));
test('blank quantities are rejected rather than silently treated as zero', () => assert.throws(() => quantityToGrams('', 'g'), /non-negative/));
test('invalid saved nutrient values are rejected by the calculation engine', () => assert.throws(() => calculateIngredient({ nutrientsPer100g: { calories: 'bad' } }, 100), /finite, non-negative/));
test('recipe totals sum ingredient contributions and divide by servings', () => {
  const result = calculateRecipe([{ ingredient: chicken, quantity: 100, unit: 'g' }, { ingredient: chicken, quantity: 50, unit: 'g' }], 3);
  assert.equal(result.total.calories, 300);
  assert.equal(result.perServing.calories, 100);
  assert.equal(result.perServing.protein, 5);
});
test('recipe rejects zero or invalid serving counts', () => assert.throws(() => calculateRecipe([], 0), /greater than zero/));
test('meal rejects blank recipe quantities rather than treating them as zero', () => assert.throws(() => calculateMeal([{ type: 'recipe', recipe: { perServing: {} }, quantity: '' }]), /non-negative/));
test('meal totals combine individual ingredients and multiple recipes', () => {
  const recipe = { perServing: { calories: 250, protein: 12, carbohydrates: 20, fat: 9, fiber: 3, sodium: 400, potassium: 200, saturatedFat: 2, cholesterol: 30, calcium: 80 } };
  const result = calculateMeal([{ type: 'ingredient', ingredient: chicken, quantity: 100, unit: 'g' }, { type: 'recipe', recipe, quantity: 2 }, { type: 'recipe', recipe, quantity: 0.5 }]);
  assert.equal(result.totals.calories, 825);
  assert.equal(result.totals.protein, 40);
});
test('daily-style nutrition summation returns totals and flags missing nutrient values', () => {
  const first = calculateIngredient(chicken, 100);
  const partial = { nutrients: { ...emptyNutrients(), calories: 50, protein: null } };
  const result = sumNutrition([first, partial]);
  assert.equal(result.totals.calories, 250);
  assert.equal(result.totals.protein, 10);
  assert.ok(result.missingNutrients.includes('protein'));
});
test('a nutrient absent from every component remains null, not a misleading zero', () => {
  const result = sumNutrition([{ nutrients: emptyNutrients() }]);
  assert.equal(result.totals.calories, null);
  assert.ok(result.missingNutrients.includes('calories'));
});
test('USDA nutrient extraction maps nutrient identifiers to app fields', () => {
  const result = extractFdcNutrients({ foodNutrients: [{ nutrient: { id: 1008 }, amount: 123 }, { nutrient: { id: 1003 }, amount: 8 }] });
  assert.equal(result.calories, 123);
  assert.equal(result.protein, 8);
  assert.equal(result.fiber, null);
});
test('USDA energy reported only in kilojoules is converted to kilocalories', () => {
  const result = extractFdcNutrients({ foodNutrients: [{ nutrient: { id: 1062 }, amount: 418.4 }] });
  assert.ok(Math.abs(result.calories - 100) < 1e-10);
});
test('USDA branded foods with gram serving units already use the standardized per-100g nutrient basis', () => {
  const food = { fdcId: 1, description: 'Sample bar', dataType: 'Branded', servingSize: 40, servingSizeUnit: 'g', foodNutrients: [{ nutrient: { id: 1008 }, amount: 160 }, { nutrient: { id: 1003 }, amount: 8 }] };
  const result = normalizeFdcFood(food);
  assert.equal(result.nutrientsPer100g.calories, 160);
  assert.equal(result.nutrientsPer100g.protein, 8);
  assert.equal(result.reference.weightGrams, 100);
});
test('USDA branded foods with milliliter units require a density before conversion to per-100g', () => {
  const food = { fdcId: 2, description: 'Beverage', dataType: 'Branded', servingSize: 240, servingSizeUnit: 'ml', foodNutrients: [{ nutrient: { id: 1008 }, amount: 40 }] };
  const result = normalizeFdcFood(food);
  assert.equal(result.nutrientsPer100g, null);
  assert.equal(result.reference.basis, '100ml');
  assert.equal(result.reference.weightGrams, null);
  assert.equal(normalizeToPer100g(result.importedNutrients, 104).calories, 40 * 100 / 104);
});
test('USDA branded food with an unrecognized basis requires confirmation', () => {
  const food = { fdcId: 3, description: 'Unknown basis', dataType: 'Branded', servingSize: 1, servingSizeUnit: 'cup', foodNutrients: [{ nutrient: { id: 1008 }, amount: 100 }] };
  const result = normalizeFdcFood(food);
  assert.equal(result.nutrientsPer100g, null);
  assert.equal(result.reference.basis, 'unknown');
});
test('USDA volume portions can provide ingredient-specific conversion weights', () => {
  const food = { fdcId: 3, description: 'Flour', dataType: 'Foundation', foodPortions: [{ amount: 1, gramWeight: 120, portionDescription: '1 cup' }], foodNutrients: [] };
  const result = normalizeFdcFood(food);
  assert.equal(result.portions[0].gramWeight, 120);
});
