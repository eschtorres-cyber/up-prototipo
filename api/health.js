// api/health.js — Diagnóstico: prueba todos los modelos disponibles
export default async function handler(req, res) {
  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_KEY) {
    return res.status(200).json({
      status: 'error',
      step: 'env',
      message: 'GEMINI_API_KEY no configurada en Vercel Environment Variables'
    });
  }

  const MODELS = [
    'gemini-2.5-flash-preview-04-17',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
  ];

  const results = [];

  for (const model of MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
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
      results.push({
        model,
        status: response.ok && text ? 'ok' : 'error',
        http: response.status,
        response: text.trim() || body.error?.message?.slice(0, 80)
      });
    } catch (err) {
      results.push({ model, status: 'error', message: err.message });
    }
  }

  const working = results.find(r => r.status === 'ok');
  return res.status(200).json({
    status: working ? 'ok' : 'all_failed',
    best_model: working?.model || null,
    node_version: process.version,
    models: results
  });
}
