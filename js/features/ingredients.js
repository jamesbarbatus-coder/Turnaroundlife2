import { getAllRecords, putRecord, deleteRecord } from '../core/database.js';
import { NUTRIENTS, NUTRIENT_KEYS } from '../nutrition/nutrients.js';
import { normalizeToPer100g } from '../nutrition/conversions.js';
import { normalizeFdcFood } from '../nutrition/usda-normalizer.js';

const $ = selector => document.querySelector(selector);
const nutrientFields = $('#ingredient-nutrients');
let savedIngredients = [];
let activeImportedFood = null;

function makeId() { return globalThis.crypto?.randomUUID?.() || `ing-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function numericValue(value) { if (value === '' || value === null || value === undefined) return null; const number = Number(value); return Number.isFinite(number) ? number : null; }
function setStatus(message, kind = '') { const node = $('#usda-status'); node.textContent = message; node.className = `inline-status ${kind}`.trim(); }
function format(value, digits = 1) { return value === null || value === undefined || !Number.isFinite(Number(value)) ? '—' : new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(Number(value)); }

function buildNutrientFields() {
  nutrientFields.replaceChildren();
  for (const key of NUTRIENT_KEYS) {
    const definition = NUTRIENTS[key];
    const wrapper = document.createElement('div'); wrapper.className = 'form-field';
    const label = document.createElement('label'); label.htmlFor = `nutrient-${key}`; label.textContent = `${definition.label} (${definition.unit})`;
    const input = document.createElement('input'); input.id = `nutrient-${key}`; input.type = 'number'; input.inputMode = 'decimal'; input.step = 'any'; input.min = '0'; input.placeholder = '—'; input.dataset.nutrient = key;
    wrapper.append(label, input); nutrientFields.append(wrapper);
  }
}

function openDialog(ingredient = null, imported = null) {
  const dialog = $('#ingredient-dialog');
  activeImportedFood = imported;
  $('#ingredient-form').reset();
  $('#ingredient-id').value = ingredient?.id || '';
  $('#ingredient-dialog-title').textContent = ingredient ? 'Edit ingredient' : 'Add ingredient';
  $('#ingredient-name').value = ingredient?.name || imported?.name || '';
  $('#ingredient-category').value = ingredient?.category || '';
  const basis = imported?.reference?.basis || '100g';
  $('#reference-basis').value = basis;
  $('#reference-basis').disabled = Boolean(ingredient || (imported && basis !== 'unknown'));
  const referenceWeight = imported?.reference?.weightGrams ?? (basis === '100g' ? 100 : '');
  $('#reference-weight').value = referenceWeight === null ? '' : referenceWeight;
  $('#reference-weight-field').hidden = basis === '100g' || basis === 'unknown';
  $('#reference-weight-label').textContent = basis === '100ml' ? 'Grams in 100 mL (verified density)' : 'Reference serving weight (grams)';
  $('#reference-weight').placeholder = basis === '100ml' ? 'Enter grams per 100 mL' : 'Enter verified gram weight';
  const nutrientValues = ingredient ? ingredient.nutrientsPer100g : imported ? imported.importedNutrients : null;
  for (const key of NUTRIENT_KEYS) {
    const value = nutrientValues?.[key];
    $(`#nutrient-${key}`).value = value === null || value === undefined ? '' : value;
  }
  $('#grams-per-cup').value = ingredient?.measurementConversions?.gramsPerCup ?? imported?.measurementConversions?.gramsPerCup ?? '';
  $('#grams-per-tbsp').value = ingredient?.measurementConversions?.gramsPerTablespoon ?? imported?.measurementConversions?.gramsPerTablespoon ?? '';
  $('#conversion-source').value = ingredient?.measurementConversions?.source || imported?.measurementConversions?.source || '';
  $('#ingredient-form-note').textContent = imported?.reference?.basis === '100ml'
    ? 'USDA supplied values per 100 mL. Enter a verified grams-per-100-mL density to convert accurately to the app’s per-100-gram basis.'
    : imported?.reference?.basis === 'unknown' ? 'USDA did not identify whether this record is per 100 g or per 100 mL. Confirm the reference basis before saving.' : '';
  $('#ingredient-form-error').textContent = '';
  dialog.showModal();
  $('#ingredient-name').focus();
}

function renderResults(foods) {
  const container = $('#usda-results'); container.replaceChildren();
  if (!foods.length) { setStatus('No matching foods were found. Try a different search term.', ''); return; }
  setStatus(`${foods.length} matching USDA records. Choose the closest match.`, 'success');
  for (const food of foods) {
    const card = document.createElement('article'); card.className = 'usda-result';
    const copy = document.createElement('div'); copy.className = 'usda-result-copy';
    const name = document.createElement('strong'); name.textContent = food.description || 'Unnamed USDA food';
    const meta = document.createElement('span'); meta.textContent = [food.dataType, food.brandOwner, `FDC ${food.fdcId}`].filter(Boolean).join(' · ');
    copy.append(name, meta);
    const button = document.createElement('button'); button.className = 'secondary-button compact-button'; button.type = 'button'; button.textContent = 'Review'; button.addEventListener('click', () => importFood(food.fdcId, button));
    card.append(copy, button); container.append(card);
  }
}

async function requestUsda(params) {
  let response;
  try { response = await fetch(`/.netlify/functions/usda?${new URLSearchParams(params)}`, { headers: { accept: 'application/json' }, cache: 'no-store' }); }
  catch { throw new Error('Network failure: the USDA search service could not be reached. Check your connection.'); }
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error(`Serverless function failure: expected JSON but received an invalid response (HTTP ${response.status}).`); }
  if (!response.ok || !payload?.ok) {
    const code = payload?.error?.code || 'FUNCTION_ERROR';
    const message = payload?.error?.message || `The USDA function returned HTTP ${response.status}.`;
    if (code === 'USDA_KEY_MISSING') throw new Error(`USDA setup required: ${message}`);
    if (code === 'USDA_AUTH_ERROR') throw new Error(`USDA authentication failure: ${message}`);
    if (code.startsWith('USDA_')) throw new Error(`USDA API error: ${message}`);
    throw new Error(`Serverless function failure: ${message}`);
  }
  return payload.data;
}

async function searchUsda(query) {
  setStatus('Searching USDA FoodData Central…'); $('#usda-results').replaceChildren();
  try {
    const data = await requestUsda({ action: 'search', q: query });
    if (!Array.isArray(data.foods)) throw new Error('USDA returned an unexpected search response.');
    renderResults(data.foods);
  } catch (error) { setStatus(error.message, 'error'); console.error('[Turnaround Life] USDA search:', error.message); }
}

function portionConversions(portions = []) {
  let gramsPerCup = null; let gramsPerTablespoon = null;
  for (const portion of portions) {
    const label = String(portion.description || '').toLowerCase();
    const amount = Number(portion.amount);
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(portion.gramWeight) || portion.gramWeight <= 0) continue;
    if (label.includes('cup') && gramsPerCup === null) gramsPerCup = portion.gramWeight / amount;
    if ((label.includes('tablespoon') || /\btbsp\b/.test(label)) && gramsPerTablespoon === null) gramsPerTablespoon = portion.gramWeight / amount;
  }
  return { gramsPerCup, gramsPerTablespoon, source: gramsPerCup || gramsPerTablespoon ? 'USDA FoodData Central portion weight' : '' };
}

async function importFood(fdcId, button) {
  button.disabled = true; button.textContent = 'Loading…';
  try {
    const data = await requestUsda({ action: 'food', fdcId: String(fdcId) });
    const normalized = normalizeFdcFood(data);
    normalized.measurementConversions = portionConversions(normalized.portions);
    openDialog(null, normalized);
  } catch (error) { setStatus(error.message, 'error'); console.error('[Turnaround Life] USDA food detail:', error.message); }
  finally { button.disabled = false; button.textContent = 'Review'; }
}

function renderIngredients(filter = '') {
  const list = $('#ingredient-list'); list.replaceChildren();
  const query = filter.trim().toLocaleLowerCase();
  const filtered = savedIngredients.filter(item => !query || `${item.name} ${item.category || ''}`.toLocaleLowerCase().includes(query));
  $('#ingredient-count').textContent = String(savedIngredients.length);
  if (!filtered.length) {
    const empty = document.createElement('div'); empty.className = 'empty-library'; empty.textContent = savedIngredients.length ? 'No saved ingredients match that filter.' : 'Your ingredient library is ready. Add an ingredient manually or search USDA.'; list.append(empty); return;
  }
  for (const ingredient of filtered.sort((a,b) => a.name.localeCompare(b.name))) {
    const card = document.createElement('article'); card.className = 'ingredient-card';
    const details = document.createElement('div'); details.className = 'ingredient-card-main';
    const title = document.createElement('strong'); title.textContent = ingredient.name;
    const meta = document.createElement('span'); meta.textContent = [ingredient.category, ingredient.source || 'Manual entry'].filter(Boolean).join(' · ');
    const summary = document.createElement('p'); summary.textContent = `${format(ingredient.nutrientsPer100g.calories,0)} kcal · ${format(ingredient.nutrientsPer100g.protein)} g protein · ${format(ingredient.nutrientsPer100g.carbohydrates)} g carbs · ${format(ingredient.nutrientsPer100g.fat)} g fat per 100 g`;
    details.append(title, meta, summary);
    const actions = document.createElement('div'); actions.className = 'ingredient-actions';
    const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'text-button'; edit.textContent = 'Edit'; edit.addEventListener('click', () => openDialog(ingredient));
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'text-button danger-text'; remove.textContent = 'Delete'; remove.addEventListener('click', () => removeIngredient(ingredient));
    actions.append(edit, remove); card.append(details, actions); list.append(card);
  }
}

async function refreshIngredients() { savedIngredients = await getAllRecords('ingredients'); renderIngredients($('#ingredient-filter').value); }
async function removeIngredient(ingredient) {
  if (!window.confirm(`Delete “${ingredient.name}” from your ingredient library? Existing recipe references are not automatically deleted.`)) return;
  try { await deleteRecord('ingredients', ingredient.id); await refreshIngredients(); }
  catch (error) { console.error('[Turnaround Life] Ingredient delete:', error); window.alert(`Could not delete this ingredient: ${error.message}`); }
}

async function saveIngredient(event) {
  event.preventDefault();
  const errorNode = $('#ingredient-form-error'); errorNode.textContent = '';
  const name = $('#ingredient-name').value.trim();
  if (!name) { errorNode.textContent = 'Enter an ingredient name.'; return; }
  const basis = $('#reference-basis').value;
  if (basis === 'unknown') { errorNode.textContent = 'Confirm the USDA nutrient reference basis before saving.'; return; }
  const referenceWeight = basis === '100g' ? 100 : Number($('#reference-weight').value);
  if (!Number.isFinite(referenceWeight) || referenceWeight <= 0) { errorNode.textContent = 'Enter a verified reference weight greater than zero grams.'; return; }
  const enteredNutrients = {};
  for (const key of NUTRIENT_KEYS) {
    const input = $(`#nutrient-${key}`);
    if (input.value !== '' && (!Number.isFinite(Number(input.value)) || Number(input.value) < 0)) { errorNode.textContent = `${NUTRIENTS[key].label} must be a non-negative number.`; input.focus(); return; }
    enteredNutrients[key] = numericValue(input.value);
  }
  let nutrientsPer100g;
  try { nutrientsPer100g = normalizeToPer100g(enteredNutrients, referenceWeight); }
  catch (error) { errorNode.textContent = error.message; return; }
  const gramsPerCup = numericValue($('#grams-per-cup').value);
  const gramsPerTablespoon = numericValue($('#grams-per-tbsp').value);
  if ([gramsPerCup, gramsPerTablespoon].some(value => value !== null && value <= 0)) { errorNode.textContent = 'Volume conversions must be greater than zero.'; return; }
  const id = $('#ingredient-id').value || makeId();
  const existing = savedIngredients.find(item => item.id === id);
  const record = {
    id, name, category: $('#ingredient-category').value.trim(),
    nutrientsPer100g,
    measurementConversions: { gramsPerCup, gramsPerTablespoon, source: $('#conversion-source').value.trim() || null },
    source: activeImportedFood ? 'USDA FoodData Central' : (existing?.source || 'Manual entry'), fdcId: activeImportedFood?.fdcId || existing?.fdcId || null, dataType: activeImportedFood?.dataType || existing?.dataType || null,
    nutritionBasis: 'per-100g', inputReferenceBasis: basis, inputReferenceWeightGrams: referenceWeight,
    sourceReferenceBasis: activeImportedFood?.reference?.basis || existing?.sourceReferenceBasis || basis,
    sourceReferenceLabel: activeImportedFood?.reference?.label || existing?.sourceReferenceLabel || null,
    createdAt: existing?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(), schemaVersion: 1
  };
  try {
    await putRecord('ingredients', record);
    await refreshIngredients();
    activeImportedFood = null;
    $('#ingredient-dialog').close();
    const status = record.fdcId ? 'USDA ingredient saved to this device.' : 'Ingredient saved to this device.';
    setStatus(status, 'success');
  } catch (error) { errorNode.textContent = `Could not save ingredient: ${error.message}`; console.error('[Turnaround Life] Ingredient save:', error); }
}

export async function initIngredients() {
  buildNutrientFields();
  $('#add-ingredient-button').addEventListener('click', () => openDialog());
  $('#close-ingredient-dialog').addEventListener('click', () => $('#ingredient-dialog').close());
  $('#cancel-ingredient').addEventListener('click', () => $('#ingredient-dialog').close());
  $('#ingredient-form').addEventListener('submit', saveIngredient);
  $('#reference-basis').addEventListener('change', event => { const basis = event.target.value; $('#ingredient-form-note').textContent = ''; const needsWeight = basis === 'serving' || basis === '100ml'; $('#reference-weight-field').hidden = !needsWeight; $('#reference-weight-label').textContent = basis === '100ml' ? 'Grams in 100 mL (verified density)' : 'Reference serving weight (grams)'; $('#reference-weight').placeholder = basis === '100ml' ? 'Enter grams per 100 mL' : 'Enter verified gram weight'; if (basis === '100g') $('#reference-weight').value = '100'; else $('#reference-weight').value = ''; });
  $('#usda-search-form').addEventListener('submit', event => { event.preventDefault(); const query = $('#usda-query').value.trim(); if (query.length < 2) { setStatus('Enter at least two characters to search.', 'error'); return; } searchUsda(query); });
  $('#ingredient-filter').addEventListener('input', event => renderIngredients(event.target.value));
  $('#ingredient-dialog').addEventListener('click', event => { if (event.target === $('#ingredient-dialog')) $('#ingredient-dialog').close(); });
  try { await refreshIngredients(); }
  catch (error) { setStatus(`Local ingredient storage is unavailable: ${error.message}`, 'error'); console.error('[Turnaround Life] Ingredient initialization:', error); }
}
