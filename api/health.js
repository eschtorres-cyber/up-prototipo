// api/health.js — Diagnóstico: prueba modelos en v1 y v1beta
export default async function handler(req, res) {
  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_KEY) {
    return res.status(200).json({
      status: 'error',
      step: 'env',
      message: 'GEMINI_API_KEY no configurada en Vercel Environment Variables'
    });
  }

  // Combos de versión de API + modelo a probar
  const COMBOS = [
    { api: 'v1',     model: 'gemini-2.5-flash' },
    { api: 'v1',     model: 'gemini-2.5-pro' },
    { api: 'v1',     model: 'gemini-2.0-flash' },
    { api: 'v1',     model: 'gemini-2.0-flash-lite' },
    { api: 'v1beta', model: 'gemini-2.5-flash' },
    { api: 'v1beta', model: 'gemini-2.5-flash-preview-04-17' },
    { api: 'v1beta', model: 'gemini-2.0-flash' },
    { api: 'v1beta', model: 'gemini-1.5-flash' },
  ];

  const results = [];

  for (const { api, model } of COMBOS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/${api}/models/${model}:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Respondé solo: OK' }] }],
            generationConfig: { maxOutputTokens: 5 }
          })
        }
      );
      const body = await response.json();
      const text = body.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const ok = response.ok && !!text;
      results.push({
        combo: `${api}/${model}`,
        status: ok ? '✅ OK' : '❌',
        http: response.status,
        response: ok ? text.trim() : (body.error?.message || '').slice(0, 100)
      });
      if (ok) break; // Encontramos uno que funciona, no hace falta seguir
    } catch (err) {
      results.push({ combo: `${api}/${model}`, status: '❌ fetch error', message: err.message });
    }
  }

  const working = results.find(r => r.status === '✅ OK');
  return res.status(200).json({
    status: working ? 'ok' : 'all_failed',
    best_combo: working?.combo || null,
    node_version: process.version,
    results
  });
}
