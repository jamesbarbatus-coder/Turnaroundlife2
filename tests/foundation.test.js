import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root=new URL('../',import.meta.url);
test('service worker explicitly bypasses Netlify Functions',async()=>{const sw=await readFile(new URL('service-worker.js',root),'utf8');assert.match(sw,/url\.pathname\.startsWith\('\/\.netlify\/functions\/'\)/);});
test('service worker caches Phase 2 modules and uses a new cache version',async()=>{const sw=await readFile(new URL('service-worker.js',root),'utf8');assert.match(sw,/turnaround-life-shell-v2/);for(const path of ['/js/features/ingredients.js','/js/nutrition/calculator.js','/js/nutrition/usda-normalizer.js'])assert.ok(sw.includes(path));});
test('Netlify functions directory is configured',async()=>{const config=await readFile(new URL('netlify.toml',root),'utf8');assert.match(config,/functions\s*=\s*"netlify\/functions"/);});
test('all six primary navigation routes exist',async()=>{const html=await readFile(new URL('index.html',root),'utf8');for(const route of ['dashboard','recipes','meal','planner','ingredients','measurements'])assert.match(html,new RegExp(`data-route="${route}"`));});
test('settings panel contains no sugar tracking row or explanatory phrase',async()=>{const html=await readFile(new URL('index.html',root),'utf8');assert.doesNotMatch(html,/Sugar tracking|Sugar Tracking Not Included in Turnaround Life|Not included in Turnaround Life/i);});
test('ingredient library UI exposes USDA search and manual entry',async()=>{const html=await readFile(new URL('index.html',root),'utf8');assert.match(html,/usda-search-form/);assert.match(html,/add-ingredient-button/);assert.match(html,/ingredient-form/);});
test('nutrition model excludes sugar and includes the requested additional nutrients',async()=>{const source=await readFile(new URL('js/nutrition/nutrients.js',root),'utf8');for(const key of ['potassium','saturatedFat','cholesterol','calcium'])assert.match(source,new RegExp(key));assert.doesNotMatch(source,/sugar/i);});
test('Phase 1 database name and version remain compatible',async()=>{const source=await readFile(new URL('js/core/database.js',root),'utf8');assert.match(source,/DB_NAME\s*=\s*'turnaround-life'/);assert.match(source,/DB_VERSION\s*=\s*1/);});

test('USDA credentials are only read by the serverless function',async()=>{const client=await readFile(new URL('js/features/ingredients.js',root),'utf8');const fn=await readFile(new URL('netlify/functions/usda.js',root),'utf8');assert.match(client,/\/\.netlify\/functions\/usda/);assert.doesNotMatch(client,/api_key=|process\.env\.USDA_API_KEY/);assert.match(fn,/process\.env\.USDA_API_KEY/);});
