exports.handler = async function (event) {
  const query = event.queryStringParameters && event.queryStringParameters.query;
  if (!query || !query.trim()) return { statusCode: 400, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: 'A search query is required.' }) };
  const key = process.env.USDA_API_KEY;
  if (!key) return { statusCode: 503, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: 'USDA_API_KEY is not configured in Netlify.' }) };
  try {
    const response = await fetch('https://api.nal.usda.gov/fdc/v1/foods/search?api_key=' + encodeURIComponent(key), {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: query.trim(), pageSize: 12, dataType: ['Foundation', 'SR Legacy', 'Survey (FNDDS)', 'Branded'] })
    });
    const body = await response.text();
    return { statusCode: response.status, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=300' }, body };
  } catch (error) {
    return { statusCode: 502, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: 'Could not reach USDA FoodData Central.' }) };
  }
};
