export const NUTRIENTS = Object.freeze({
  calories: { label: 'Calories', unit: 'kcal', fdcIds: [1008, 2048, 2047] },
  protein: { label: 'Protein', unit: 'g', fdcIds: [1003] },
  carbohydrates: { label: 'Carbohydrates', unit: 'g', fdcIds: [1005] },
  fat: { label: 'Total fat', unit: 'g', fdcIds: [1004] },
  fiber: { label: 'Fiber', unit: 'g', fdcIds: [1079] },
  sodium: { label: 'Sodium', unit: 'mg', fdcIds: [1093] },
  potassium: { label: 'Potassium', unit: 'mg', fdcIds: [1092] },
  saturatedFat: { label: 'Saturated fat', unit: 'g', fdcIds: [1258] },
  cholesterol: { label: 'Cholesterol', unit: 'mg', fdcIds: [1253] },
  calcium: { label: 'Calcium', unit: 'mg', fdcIds: [1087] }
});
export const NUTRIENT_KEYS = Object.freeze(Object.keys(NUTRIENTS));
export function emptyNutrients() { return Object.fromEntries(NUTRIENT_KEYS.map(key => [key, null])); }
