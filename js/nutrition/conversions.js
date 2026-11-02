export const GRAMS_PER_OUNCE = 28.349523125;
export const TABLESPOONS_PER_US_CUP = 16;
export const SUPPORTED_UNITS = Object.freeze(['g', 'oz', 'cup', 'tbsp']);

export function quantityToGrams(quantity, unit, conversions = {}) {
  if (quantity === '' || quantity === null || quantity === undefined || typeof quantity === 'boolean') throw new RangeError('Quantity must be a finite, non-negative number.');
  const amount = Number(quantity);
  if (!Number.isFinite(amount) || amount < 0) throw new RangeError('Quantity must be a finite, non-negative number.');
  if (!SUPPORTED_UNITS.includes(unit)) throw new TypeError(`Unsupported measurement unit: ${unit}`);
  if (unit === 'g') return amount;
  if (unit === 'oz') return amount * GRAMS_PER_OUNCE;
  if (unit === 'cup') {
    const gramsPerCup = positive(conversions.gramsPerCup);
    if (gramsPerCup === null) throw new Error('A verified grams-per-cup conversion is not available for this ingredient. Enter the weight in grams or add a conversion.');
    return amount * gramsPerCup;
  }
  const gramsPerTablespoon = positive(conversions.gramsPerTablespoon)
    ?? (positive(conversions.gramsPerCup) === null ? null : positive(conversions.gramsPerCup) / TABLESPOONS_PER_US_CUP);
  if (gramsPerTablespoon === null) throw new Error('A verified tablespoon conversion is not available for this ingredient. Enter the weight in grams or add a conversion.');
  return amount * gramsPerTablespoon;
}
function positive(value) { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : null; }
export function normalizeToPer100g(values, referenceWeightGrams) {
  const weight = Number(referenceWeightGrams);
  if (!Number.isFinite(weight) || weight <= 0) throw new RangeError('Reference weight must be greater than zero grams.');
  return Object.fromEntries(Object.entries(values).map(([key, value]) => {
    if (value === null || value === '' || value === undefined) return [key, null];
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) throw new RangeError(`${key} must be a finite, non-negative nutrient value.`);
    return [key, number * 100 / weight];
  }));
}
