import { NUTRIENTS, emptyNutrients } from './nutrients.js';
import { normalizeToPer100g } from './conversions.js';

function nutrientId(entry) { return Number(entry?.nutrient?.id ?? entry?.nutrientId ?? entry?.id); }
function nutrientAmount(entry) { const raw = entry?.amount ?? entry?.value ?? entry?.nutrient?.amount; const n = Number(raw); return Number.isFinite(n) ? n : null; }

export function extractFdcNutrients(food) {
  const result = emptyNutrients();
  const entries = food?.foodNutrients || [];
  for (const [key, definition] of Object.entries(NUTRIENTS)) {
    const match = definition.fdcIds.map(id => entries.find(entry => nutrientId(entry) === id)).find(Boolean);
    if (match) result[key] = nutrientAmount(match);
  }
  if (result.calories === null) {
    const energyKj = entries.find(entry => nutrientId(entry) === 1062);
    const amountKj = energyKj ? nutrientAmount(energyKj) : null;
    if (amountKj !== null) result.calories = amountKj / 4.184;
  }
  return result;
}

export function getFdcReference(food) {
  const dataType = String(food?.dataType || '');
  if (/branded/i.test(dataType)) {
    const unit = String(food?.servingSizeUnit || '').trim().toLowerCase();
    // USDA standardizes branded nutrient values to a 100 g or 100 ml basis.
    // The servingSize field describes the label serving; it is NOT the nutrient reference basis.
    if (['g', 'gram', 'grams'].includes(unit)) return { basis: '100g', weightGrams: 100, label: 'USDA standardized per 100 grams' };
    if (['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres'].includes(unit)) return { basis: '100ml', weightGrams: null, label: 'USDA standardized per 100 mL (density required)' };
    return { basis: 'unknown', weightGrams: null, label: 'USDA nutrient reference basis needs confirmation' };
  }
  return { basis: '100g', weightGrams: 100, label: 'Per 100 grams' };
}

export function normalizeFdcFood(food) {
  const nutrients = extractFdcNutrients(food);
  const reference = getFdcReference(food);
  const per100g = reference.weightGrams ? normalizeToPer100g(nutrients, reference.weightGrams) : null;
  const portions = (food?.foodPortions || []).filter(item => Number(item.gramWeight) > 0).map(item => ({
    description: item.portionDescription || item.modifier || item.measureUnit?.name || 'USDA portion',
    amount: Number(item.amount) || 1,
    gramWeight: Number(item.gramWeight)
  }));
  return {
    name: food?.description || '',
    fdcId: String(food?.fdcId ?? ''),
    dataType: food?.dataType || 'Unknown',
    nutrientsPer100g: per100g,
    importedNutrients: nutrients,
    reference,
    portions,
    source: 'USDA FoodData Central'
  };
}
