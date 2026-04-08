// api/health.js — Diagnóstico de la función Gemini
export default async function handler(req, res) {
  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_KEY) {
    return res.status(200).json({
      status: 'error',
      step: 'env',
      message: 'GEMINI_API_KEY no está configurada en Vercel Environment Variables'
    });
  }

  // Probar conexión real con Gemini
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respondé solo: OK' }] }],
          generationConfig: { maxOutputTokens: 10 }
        })
      }
    );

    const status = response.status;
    const body = await response.json();
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!response.ok) {
      return res.status(200).json({
        status: 'error',
        step: 'gemini_call',
        http_status: status,
        gemini_error: body.error?.message || JSON.stringify(body)
      });
    }

    return res.status(200).json({
      status: 'ok',
      gemini_response: text.trim(),
      model: 'gemini-2.0-flash',
      node_version: process.version
    });

  } catch (err) {
    return res.status(200).json({
      status: 'error',
      step: 'fetch',
      message: err.message,
      node_version: process.version
    });
  }
}
