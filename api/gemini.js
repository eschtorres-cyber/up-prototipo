// api/gemini.js — Powered by Claude (Anthropic)

const UP_SYSTEM = `Sos UP — un coach de desarrollo profesional integrado en una app.
Tu voz es directa, empática y precisa. Nunca genérica. Siempre orientada al impacto real.

Reglas de respuesta:
- Segunda persona siempre ("Lideraste", "Demostraste", "Propusiste")
- Sin frases de relleno ("Es importante...", "Recordá que...", "Como profesional...")
- Sin introducción ni cierre — devolvés solo lo pedido
- Específico a lo que el usuario escribió, nunca respuestas de plantilla
- Tono: colega senior que te conoce, no terapeuta ni motivador genérico
- Cuando devolvés JSON: solo el JSON, sin markdown, sin comentarios`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tipo, datos } = req.body;
  const API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada en Vercel' });
  }

  let prompt = '';

  // ── 1. SÍNTESIS DE ENTRADA DE DIARIO ─────────────────
  if (tipo === 'sintesis') {
    const { texto, norte, rol } = datos;
    prompt = `Rol: ${rol || 'profesional'}
Norte: ${norte || 'crecer profesionalmente'}
Entrada de hoy: "${texto}"

2 oraciones cortas. Primera: qué hizo y qué significa. Segunda: cómo conecta con su norte. Máx 25 palabras en total.`;
  }

  // ── 2. MEJORAR OBJETIVO CON UP ────────────────────────
  else if (tipo === 'mejorar_norte') {
    const { objetivo, rol, horizonte } = datos;
    prompt = `Rol: ${rol || 'profesional'}
Objetivo en bruto: "${objetivo}"
Horizonte: ${horizonte || '3 meses'}

Evaluá la complejidad del objetivo y el horizonte de tiempo para decidir cuántos hitos son necesarios:
- 1 mes → 2 hitos (foco total, ejecución inmediata)
- 3 meses → 3-4 hitos (equilibrio entre estrategia y ejecución)
- 6 meses → 4-5 hitos (progresión clara con hitos de validación)
- 1 año → 5-6 hitos (milestones estratégicos que marcan etapas)
Si el objetivo es muy acotado, menos hitos. Si es transformacional, más.

Devolvé este JSON:
{
  "objetivo": "1 oración. Qué vas a lograr y para qué. Máx 15 palabras.",
  "hitos": [
    "verbo + resultado concreto. máx 8 palabras.",
    "verbo + resultado concreto. máx 8 palabras."
  ]
}
Cada hito debe poder leerse en 3 segundos. Sin explicaciones extra.`;
  }

  // ── 3. RESUMEN SEMANAL EJECUTIVO ──────────────────────
  else if (tipo === 'resumen_semanal') {
    const { entradas, norte, rol } = datos;
    const textos = entradas.map((e, i) => `${i+1}. ${e.texto}`).join('\n');
    prompt = `Rol: ${rol || 'profesional'}
Norte: ${norte || 'crecer profesionalmente'}

Entradas de la semana:
${textos}

Devolvé este JSON:
{
  "avances": ["logro específico 1", "logro 2", "logro 3"],
  "para_llevar": ["acción concreta para la próxima semana 1", "acción 2"],
  "intencion": "una frase de intención para arrancar la semana, específica al contexto del usuario"
}`;
  }

  // ── 4. DETECTAR LOGROS ────────────────────────────────
  else if (tipo === 'detectar_logros') {
    const { entradas, norte } = datos;
    const textos = entradas.slice(0, 20).map((e, i) => `${i+1}. ${e.texto}`).join('\n');
    prompt = `Norte: ${norte || 'crecimiento profesional'}

Entradas:
${textos}

Detectá logros concretos. Devolvé este JSON:
{
  "logros": [
    { "titulo": "máx 5 palabras. verbo pasado + resultado.", "descripcion": "1 oración. qué pasó y qué impacto tuvo." }
  ]
}
Máximo 5 logros. Solo los más relevantes. Sin logros genéricos.`;
  }

  else {
    return res.status(400).json({ error: 'Tipo de análisis no reconocido' });
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
        model: 'claude-sonnet-4-5',
        max_tokens: 512,
        system: UP_SYSTEM,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Anthropic error:', response.status, errBody);
      return res.status(502).json({ error: `Anthropic error ${response.status}: ${errBody.slice(0, 200)}` });
    }

    const result = await response.json();
    const text = result.content?.[0]?.text || '';

    if (!text) {
      console.error('Anthropic empty response:', JSON.stringify(result));
      return res.status(502).json({ error: 'Respuesta vacía de Claude' });
    }

    // Para respuestas JSON intentar parsear
    if (['mejorar_norte', 'resumen_semanal', 'detectar_logros'].includes(tipo)) {
      try {
        const json = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
        return res.status(200).json({ resultado: json });
      } catch {
        return res.status(200).json({ resultado: text });
      }
    }

    return res.status(200).json({ resultado: text });

  } catch (error) {
    console.error('Anthropic fetch error:', error);
    return res.status(500).json({ error: 'Error al llamar a Claude: ' + error.message });
  }
}
