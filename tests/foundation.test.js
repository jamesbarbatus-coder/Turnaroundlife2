import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root=new URL('../',import.meta.url);
test('service worker explicitly bypasses Netlify Functions',async()=>{const sw=await readFile(new URL('service-worker.js',root),'utf8');assert.match(sw,/url\.pathname\.startsWith\('\/\.netlify\/functions\/'\)/);});
test('Netlify functions directory is configured',async()=>{const config=await readFile(new URL('netlify.toml',root),'utf8');assert.match(config,/functions\s*=\s*"netlify\/functions"/);});
test('all six primary navigation routes exist',async()=>{const html=await readFile(new URL('index.html',root),'utf8');for(const route of ['dashboard','recipes','meal','planner','ingredients','measurements'])assert.match(html,new RegExp(`data-route="${route}"`));});
test('sugar tracking is not offered as a tracked nutrient',async()=>{const html=await readFile(new URL('index.html',root),'utf8');assert.doesNotMatch(html,/Sugar\s*<b>|Sugar tracker/i);});
