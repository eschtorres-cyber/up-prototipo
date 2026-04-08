// api/health.js — Diagnóstico Claude API
export default async function handler(req, res) {
  const API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!API_KEY) {
    return res.status(200).json({
      status: 'error',
      message: '❌ ANTHROPIC_API_KEY no configurada en Vercel Environment Variables'
    });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Respondé solo: OK' }]
      })
    });

    const body = await response.json();
    const text = body.content?.[0]?.text || '';

    if (!response.ok) {
      return res.status(200).json({
        status: 'error',
        http: response.status,
        error: body.error?.message || JSON.stringify(body)
      });
    }

    return res.status(200).json({
      status: 'ok ✅',
      model: 'claude-haiku-4-5',
      response: text.trim(),
      node_version: process.version
    });

  } catch (err) {
    return res.status(200).json({ status: 'error', message: err.message });
  }
}
