import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/usda.js';

const originalKey = process.env.USDA_API_KEY;
const originalFetch = globalThis.fetch;
function req(path, method = 'GET') { return new Request(`https://example.net/.netlify/functions/usda${path}`, { method }); }

test('USDA function reports a clear configuration error when API key is missing', async () => {
  delete process.env.USDA_API_KEY;
  const response = await handler(req('?action=search&q=oats'));
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.error.code, 'USDA_KEY_MISSING');
});
test('USDA function validates query and HTTP method', async () => {
  process.env.USDA_API_KEY = 'test-secret';
  let response = await handler(req('?action=search&q=x'));
  assert.equal(response.status, 400);
  response = await handler(req('?action=search&q=oats', 'POST'));
  assert.equal(response.status, 405);
});
test('USDA search sends the key server-side and returns structured JSON', async () => {
  process.env.USDA_API_KEY = 'test-secret';
  let seen;
  globalThis.fetch = async (url, options) => { seen = { url: String(url), options }; return new Response(JSON.stringify({ foods: [{ fdcId: 123, description: 'Oats' }] }), { status: 200, headers: { 'content-type': 'application/json' } }); };
  const response = await handler(req('?action=search&q=oats'));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.data.foods[0].description, 'Oats');
  assert.match(seen.url, /api_key=test-secret/);
  assert.equal(JSON.parse(seen.options.body).query, 'oats');
  assert.doesNotMatch(JSON.stringify(body), /test-secret/);
});
test('USDA detail validates FDC ID and fetches the detail endpoint', async () => {
  process.env.USDA_API_KEY = 'test-secret';
  let called = '';
  globalThis.fetch = async url => { called = String(url); return new Response(JSON.stringify({ fdcId: 77, description: 'Rice' }), { status: 200 }); };
  const response = await handler(req('?action=food&fdcId=77'));
  assert.equal(response.status, 200);
  assert.match(called, /\/food\/77/);
});
test('USDA authentication, rate limit and network errors are classified', async () => {
  process.env.USDA_API_KEY = 'test-secret';
  globalThis.fetch = async () => new Response('{}', { status: 403 });
  let response = await handler(req('?action=search&q=rice'));
  assert.equal((await response.json()).error.code, 'USDA_AUTH_ERROR');
  globalThis.fetch = async () => new Response('{}', { status: 429 });
  response = await handler(req('?action=search&q=rice'));
  assert.equal(response.status, 429);
  assert.equal((await response.json()).error.code, 'USDA_RATE_LIMIT');
  globalThis.fetch = async () => { throw new Error('offline'); };
  response = await handler(req('?action=search&q=rice'));
  assert.equal((await response.json()).error.code, 'USDA_NETWORK_ERROR');
});

test.after(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.USDA_API_KEY; else process.env.USDA_API_KEY = originalKey;
});
